import { describe, expect, it } from 'vitest';
import { trackLine } from './lines';
import { TrackIdSession } from './session';

describe('TrackIdSession', () => {
	it('announces the two tracks before every second track start, newest first', () => {
		const s = new TrackIdSession(false);
		expect(s.trackStarted('t1')).toEqual({ prepare: { trackId: 't1', form: 'first' }, announce: null });
		expect(s.trackStarted('t2')).toEqual({ prepare: { trackId: 't2', form: 'lead' }, announce: null });
		expect(s.trackStarted('t3')?.announce).toEqual({
			lead: { trackId: 't2', form: 'lead' },
			follow: { trackId: 't1', form: 'first' },
			atEnd: false
		});
		expect(s.trackStarted('t4')).toEqual({ prepare: { trackId: 't4', form: 'lead' }, announce: null });
		expect(s.trackStarted('t5')).toEqual({
			prepare: { trackId: 't5', form: 'follow' },
			announce: { lead: { trackId: 't4', form: 'lead' }, follow: { trackId: 't3', form: 'follow' }, atEnd: false }
		});
	});

	it('gives a single track one Track ID at the end, naming it as the newest', () => {
		const s = new TrackIdSession(true);
		expect(s.trackStarted('t1')?.prepare).toEqual({ trackId: 't1', form: 'lead' });
		expect(s.ended()).toEqual({ lead: { trackId: 't1', form: 'lead' }, follow: null, atEnd: true });
		expect(s.ended()).toBeNull();
	});

	it('names whatever is left when a playlist ends', () => {
		const even = new TrackIdSession(false);
		['t1', 't2', 't3', 't4'].forEach((t) => even.trackStarted(t));
		expect(even.ended()).toEqual({ lead: { trackId: 't4', form: 'lead' }, follow: { trackId: 't3', form: 'follow' }, atEnd: true });

		const odd = new TrackIdSession(false);
		['t1', 't2', 't3'].forEach((t) => odd.trackStarted(t));
		expect(odd.ended()).toEqual({ lead: { trackId: 't3', form: 'lead' }, follow: null, atEnd: true });
	});

	it('knows the line the next track will need, so it can be rendered ahead', () => {
		const s = new TrackIdSession(false);
		expect(s.nextForm()).toBe('first');
		s.trackStarted('t1');
		expect(s.nextForm()).toBe('lead');
		s.trackStarted('t2');
		expect(s.nextForm()).toBe('follow');
	});

	it('ignores the same track starting again (a resume or replay)', () => {
		const s = new TrackIdSession(true);
		s.trackStarted('t1');
		expect(s.trackStarted('t1')).toBeNull();
	});
});

describe('trackLine', () => {
	const name = { title: 'One More Time', artist: 'Daft Punk' };

	it('fills a template, the same one every time for a track and form', () => {
		const line = trackLine('0DiWol3AO6WpXZgp0goxAV', 'lead', name);
		expect(line).toContain('One More Time');
		expect(line).toContain('Daft Punk');
		expect(trackLine('0DiWol3AO6WpXZgp0goxAV', 'lead', name)).toBe(line);
	});

	it('uses the kicked-off line only for the first track', () => {
		expect(trackLine('x', 'first', name)).toBe('we kicked off with One More Time, from Daft Punk.');
	});
});
