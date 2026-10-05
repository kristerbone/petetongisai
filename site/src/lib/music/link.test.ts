import { describe, expect, it } from 'vitest';
import { parseMusicLink } from './link';

describe('parseMusicLink', () => {
	it('still reads Spotify tracks and playlists', () => {
		expect(parseMusicLink('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc')).toEqual({
			service: 'spotify',
			uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC'
		});
		expect(parseMusicLink('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M')?.service).toBe('spotify');
	});

	it('reads a Mixcloud show, with or without the www, trailing slash or tracking', () => {
		const expected = { service: 'mixcloud', uri: 'mixcloud:/BBCRadio1/essential-mix-2026/' };
		expect(parseMusicLink('https://www.mixcloud.com/BBCRadio1/essential-mix-2026/')).toEqual(expected);
		expect(parseMusicLink('https://mixcloud.com/BBCRadio1/essential-mix-2026')).toEqual(expected);
		expect(parseMusicLink('https://www.mixcloud.com/BBCRadio1/essential-mix-2026/?utm_source=widget#x')).toEqual(expected);
		expect(parseMusicLink('  https://m.mixcloud.com/BBCRadio1/essential-mix-2026/ ')).toEqual(expected);
	});

	it('reads a stored Mixcloud uri back', () => {
		expect(parseMusicLink('mixcloud:/BBCRadio1/essential-mix-2026/')?.uri).toBe('mixcloud:/BBCRadio1/essential-mix-2026/');
	});

	it('turns away everything else on Mixcloud, and other sites', () => {
		expect(parseMusicLink('https://www.mixcloud.com/BBCRadio1/')).toBeNull(); // a profile
		expect(parseMusicLink('https://www.mixcloud.com/BBCRadio1/playlists/chill/')).toBeNull();
		expect(parseMusicLink('https://www.mixcloud.com/BBCRadio1/playlists/')).toBeNull(); // a profile's tab
		expect(parseMusicLink('https://www.mixcloud.com/live/someone/')).toBeNull();
		expect(parseMusicLink('https://www.mixcloud.com/discover/house/')).toBeNull();
		expect(parseMusicLink('https://soundcloud.com/artist/track')).toBeNull();
		expect(parseMusicLink('https://evil.example/www.mixcloud.com/a/b/')).toBeNull();
		expect(parseMusicLink('')).toBeNull();
	});
});
