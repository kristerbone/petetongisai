export type PlaylistTrack = { trackId: string; durationMs: number };

/**
 * A playlist's playable tracks, in order, from Spotify's public embed page. Signed-in listeners'
 * embeds only report the playlist and each track's duration, and the Web API won't list a
 * playlist's tracks with an app-only token, so this page is the only source. It's unofficial:
 * if Spotify changes it, this returns null and Track IDs fall back to generic lines.
 * Only ids and durations are taken; names still come from MusicBrainz.
 */
export async function playlistTracks(playlistId: string): Promise<PlaylistTrack[] | null> {
	const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
		headers: { 'user-agent': 'Mozilla/5.0 (compatible; petetongisai/1.0; +https://petetongisai.com)' }
	});
	if (!res.ok) return null;
	return parseEmbedPage(await res.text());
}

type EmbedTrack = { uri?: string; duration?: number; isPlayable?: boolean };

export function parseEmbedPage(html: string): PlaylistTrack[] | null {
	const json = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1];
	if (!json) return null;
	try {
		const list: EmbedTrack[] | undefined = JSON.parse(json).props?.pageProps?.state?.data?.entity?.trackList;
		if (!Array.isArray(list)) return null;
		return list
			.filter((t) => t.isPlayable !== false && typeof t.duration === 'number' && /^spotify:track:[A-Za-z0-9]{22}$/.test(t.uri ?? ''))
			.map((t) => ({ trackId: t.uri!.slice('spotify:track:'.length), durationMs: t.duration! }));
	} catch {
		return null;
	}
}
