import { describe, expect, it } from 'vitest';
import { clientKey, decide } from './rate-limit-window';

const HOUR = 3_600_000;

describe('decide', () => {
	it('allows five plays an hour, then says when the oldest frees up', () => {
		let hits: number[] = [];
		for (let i = 0; i < 5; i++) {
			const d = decide(hits, 1000 + i * 60_000);
			expect(d.allowed).toBe(true);
			hits = d.hits;
		}
		const sixth = decide(hits, 1000 + 10 * 60_000);
		expect(sixth.allowed).toBe(false);
		expect(sixth.retryAfterS).toBe(50 * 60);
	});

	it('forgets hits older than an hour', () => {
		const old = [0, 1, 2, 3, 4];
		const d = decide(old, HOUR + 10);
		expect(d.allowed).toBe(true);
		expect(d.hits).toEqual([HOUR + 10]);
	});
});
describe('clientKey', () => {
	it('uses the IPv4 address from CloudFront-Viewer-Address', () => {
		expect(clientKey('31.94.68.150:62864', '64.252.82.185')).toBe('31.94.68.150');
	});

	it('groups IPv6 visitors by /64', () => {
		expect(clientKey('2001:db8:85a3:12::8a2e:370:7334:443', 'x')).toBe('2001:db8:85a3:12::/64');
		expect(clientKey('2001:db8:85a3:12:ffff::1:443', 'x')).toBe('2001:db8:85a3:12::/64');
		expect(clientKey('[2a02:c7c:aa::1]:443', 'x')).toBe('2a02:c7c:aa:0::/64');
	});

	it('falls back to the source address', () => {
		expect(clientKey(null, '127.0.0.1')).toBe('127.0.0.1');
	});
});
