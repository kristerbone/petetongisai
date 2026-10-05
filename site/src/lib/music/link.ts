import { parseSpotifyLink } from '$lib/spotify/link';

export type MusicLink = {
	service: 'spotify' | 'mixcloud';
	/** What gets stored with a Dedication: `spotify:track:<id>`, `spotify:playlist:<id>` or `mixcloud:/<user>/<show>/` */
	uri: string;
};

// Paths on mixcloud.com that are pages of the site, not a user's name
const RESERVED = new Set(['discover', 'live', 'upload', 'search', 'tag', 'categories', 'pro', 'select', 'settings', 'about', 'jobs', 'legal', 'developers', 'help', 'blog']);
// Tabs of a profile page, which look like a show name
const PROFILE_TABS = new Set(['playlists', 'favorites', 'listens', 'follow', 'followers', 'following', 'uploads', 'stream', 'shows', 'history', 'reposts']);
const SEGMENT = '[A-Za-z0-9_%.-]+';
const MIXCLOUD = new RegExp(`^https?://(?:www\\.|m\\.)?mixcloud\\.com/(${SEGMENT})/(${SEGMENT})/?(?:[?#].*)?$`, 'i');
const STORED_MIXCLOUD = new RegExp(`^mixcloud:/(${SEGMENT})/(${SEGMENT})/$`);

/** A Spotify track or playlist, or a single Mixcloud show. Profiles, playlists, live streams and the rest return null. */
export function parseMusicLink(input: string): MusicLink | null {
	const text = input.trim();
	const spotify = parseSpotifyLink(text);
	if (spotify) return { service: 'spotify', uri: spotify.uri };
	const m = text.match(MIXCLOUD) ?? text.match(STORED_MIXCLOUD);
	if (!m || RESERVED.has(m[1].toLowerCase()) || PROFILE_TABS.has(m[2].toLowerCase())) return null;
	return { service: 'mixcloud', uri: `mixcloud:/${m[1]}/${m[2]}/` };
}

/** The Mixcloud widget's key for a stored `mixcloud:` URI, e.g. `/BBCRadio1/essential-mix/`. */
export const mixcloudKey = (uri: string) => uri.slice('mixcloud:'.length);
