import { describe, expect, it } from 'vitest';
import { matchTrack } from './match';

const list = [
	{ trackId: 'a', durationMs: 68928 },
	{ trackId: 'b', durationMs: 107107 },
	{ trackId: 'c', durationMs: 67400 },
	{ trackId: 'd', durationMs: 67900 }
];

describe('matchTrack', () => {
	it('follows the playlist in order, allowing for the embed’s wobble', () => {
		expect(matchTrack(list, 68976, -1, new Set())).toBe(0);
		expect(matchTrack(list, 107154, 0, new Set([0]))).toBe(1);
		expect(matchTrack(list, 67424, 1, new Set([0, 1]))).toBe(2);
	});

	it('picks the next unplayed track when two durations are close', () => {
		expect(matchTrack(list, 67600, 2, new Set([0, 1, 2]))).toBe(3);
	});

	it('finds a track out of order (shuffle), and gives up when nothing fits', () => {
		expect(matchTrack(list, 107100, 2, new Set([2]))).toBe(1);
		expect(matchTrack(list, 200000, -1, new Set())).toBeNull();
	});
});
