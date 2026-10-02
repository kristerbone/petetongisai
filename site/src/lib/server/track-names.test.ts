import { describe, expect, it } from 'vitest';
import { speakableName } from './track-names';

describe('speakableName', () => {
	it('drops mix and remaster tags Pete wouldn’t say, but keeps remixers', () => {
		expect(speakableName({ title: 'Rock-A-Lot (Original Mix)', artist: 'Frankie & Sandrino' })?.title).toBe('Rock-A-Lot');
		expect(speakableName({ title: 'One More Time - 2009 Remaster', artist: 'Daft Punk' })?.title).toBe('One More Time');
		expect(speakableName({ title: 'Wow [Radio Edit]', artist: 'Hot Since 82' })?.title).toBe('Wow');
		expect(speakableName({ title: 'Circus (Fred again.. Remix)', artist: 'Jemi' })?.title).toBe('Circus (Fred again.. Remix)');
	});

	it('falls back to the first artist when the full credit is too long', () => {
		const credit = 'House of Pain feat. D.J. Muggs, Damian Marley, Everlast & Meyhem Lauren';
		expect(speakableName({ title: 'Jump Around (25 Year remix)', artist: credit }, 'House of Pain')).toEqual({
			title: 'Jump Around (25 Year remix)',
			artist: 'House of Pain'
		});
	});

	it('gives up on names too long to say cleanly', () => {
		expect(speakableName({ title: 'x'.repeat(80), artist: 'y'.repeat(20) })).toBeNull();
		expect(speakableName({ title: '(Original Mix)', artist: 'Someone' })).toBeNull();
	});
});
