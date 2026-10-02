import { Resource } from 'sst';
import type { TrackName } from '$lib/track-ids/lines';

// MusicBrainz asks every client to identify itself with a contact
const MB_USER_AGENT = 'petetongisai/1.0 ( https://petetongisai.com )';
// Longer lines drop words in Pete's voice; past this a track gets a generic line
const MAX_NAME_CHARS = 90;

export class LookupUnavailable extends Error {}

let token: { value: string; expires: number } | null = null;

/** App-only (client credentials) token: no visitor ever signs in to Spotify. */
async function spotifyToken() {
	if (token && token.expires > Date.now() + 60_000) return token.value;
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			authorization: `Basic ${btoa(`${Resource.SpotifyClientId.value}:${Resource.SpotifyClientSecret.value}`)}`,
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});
	if (!res.ok) throw new LookupUnavailable(`Spotify token ${res.status}`);
	const { access_token, expires_in } = await res.json();
	token = { value: access_token, expires: Date.now() + expires_in * 1000 };
	return token.value;
}

/** The track's ISRC from Spotify. Only the ISRC is used: Spotify's own title never reaches the voice. */
async function isrc(trackId: string): Promise<string | null> {
	const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
		headers: { authorization: `Bearer ${await spotifyToken()}` }
	});
	if (res.status === 404 || res.status === 400) return null;
	if (!res.ok) throw new LookupUnavailable(`Spotify track ${res.status}`);
	return (await res.json()).external_ids?.isrc ?? null;
}

type MbRecording = { title: string; 'artist-credit'?: { name: string; joinphrase?: string }[] };

async function musicBrainzName(isrc: string): Promise<TrackName | null> {
	const res = await fetch(`https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?inc=artist-credits&fmt=json`, {
		headers: { 'user-agent': MB_USER_AGENT, accept: 'application/json' }
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new LookupUnavailable(`MusicBrainz ${res.status}`);
	const recording: MbRecording | undefined = (await res.json()).recordings?.[0];
	const credits = recording?.['artist-credit'];
	if (!recording || !credits?.length) return null;
	return speakableName(
		{ title: recording.title, artist: credits.map((a) => a.name + (a.joinphrase ?? '')).join('') },
		credits[0].name
	);
}

/**
 * Deezer's public API, for ISRCs MusicBrainz doesn't have (it misses many older releases). No key
 * needed; its terms ask for attribution, which the About page gives.
 */
async function deezerName(isrc: string): Promise<TrackName | null> {
	const res = await fetch(`https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`);
	if (!res.ok) throw new LookupUnavailable(`Deezer ${res.status}`);
	const track = await res.json();
	if (track.error) {
		// 800 is "no data"; anything else (a quota, say) is worth trying again later
		if (track.error.code === 800) return null;
		throw new LookupUnavailable(`Deezer ${track.error.code} ${track.error.message}`);
	}
	if (typeof track.title !== 'string' || typeof track.artist?.name !== 'string') return null;
	return speakableName({ title: track.title, artist: track.artist.name });
}

/**
 * Trim what Pete wouldn't say ("(Original Mix)", "- 2009 Remaster"), and give up on names too
 * long to say cleanly. Remixes keep their remixer. A long artist credit falls back to its first artist.
 */
export function speakableName({ title, artist }: TrackName, firstArtist?: string): TrackName | null {
	const cleaned = title
		.replace(/\s*[([][^)\]]*\b(original|radio|extended|club|album|single)\s+(mix|edit|version)\b[^)\]]*[)\]]/gi, '')
		.replace(/\s*[([][^)\]]*\bremaster(ed)?\b[^)\]]*[)\]]/gi, '')
		.replace(/\s+-\s+.*\bremaster(ed)?\b.*$/i, '')
		.trim();
	const fits = (a: string) => !!cleaned && !!a && cleaned.length + a.length <= MAX_NAME_CHARS;
	if (fits(artist.trim())) return { title: cleaned, artist: artist.trim() };
	if (firstArtist && fits(firstArtist.trim())) return { title: cleaned, artist: firstArtist.trim() };
	return null;
}

/** A Spotify track's name from its ISRC, in MusicBrainz or else Deezer; null if neither knows it. */
export async function lookUpTrackName(trackId: string): Promise<TrackName | null> {
	const code = await isrc(trackId);
	if (!code) return null;
	return (await musicBrainzName(code)) ?? (await deezerName(code));
}
