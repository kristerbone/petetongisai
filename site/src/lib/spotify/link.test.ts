import { describe, expect, it } from 'vitest';
import { parseSpotifyLink } from './link';

const TRACK = '4uLU6hMCjMI75M1A2tKUQC';
const PLAYLIST = '37i9dQZF1DXcBWIGoYBM5M';

describe('parseSpotifyLink', () => {
	it('accepts track and playlist links in the shapes people paste', () => {
		expect(parseSpotifyLink(`https://open.spotify.com/track/${TRACK}?si=abc123`)).toEqual({
			kind: 'track',
			id: TRACK,
			uri: `spotify:track:${TRACK}`
		});
		expect(parseSpotifyLink(`https://open.spotify.com/intl-de/track/${TRACK}`)?.uri).toBe(`spotify:track:${TRACK}`);
		expect(parseSpotifyLink(`  https://open.spotify.com/playlist/${PLAYLIST}  `)?.kind).toBe('playlist');
		expect(parseSpotifyLink(`spotify:playlist:${PLAYLIST}`)?.id).toBe(PLAYLIST);
	});

	it('rejects albums, artists, other sites and junk', () => {
		expect(parseSpotifyLink(`https://open.spotify.com/album/${TRACK}`)).toBeNull();
		expect(parseSpotifyLink(`https://open.spotify.com/artist/${TRACK}`)).toBeNull();
		expect(parseSpotifyLink(`https://evil.example/track/${TRACK}`)).toBeNull();
		expect(parseSpotifyLink(`https://open.spotify.com/track/short`)).toBeNull();
		expect(parseSpotifyLink('not a link')).toBeNull();
	});
});
