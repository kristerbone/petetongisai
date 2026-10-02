import { describe, expect, it } from 'vitest';
import { fadeAfterDays, fadesAt, hasFaded } from './fade';

const DAY = 86_400_000;

describe('fade', () => {
	it('defaults to 30 days and accepts a configured value', () => {
		expect(fadeAfterDays(undefined)).toBe(30);
		expect(fadeAfterDays('nonsense')).toBe(30);
		expect(fadeAfterDays('7')).toBe(7);
	});

	it('fades exactly the configured number of days after the last open', () => {
		const opened = 1_790_000_000_000;
		const ttl = fadesAt(opened, 30);
		expect(hasFaded({ fadesAt: ttl }, opened + 30 * DAY - 1000)).toBe(false);
		expect(hasFaded({ fadesAt: ttl }, opened + 30 * DAY)).toBe(true);
	});

	it('never fades records without a TTL', () => {
		expect(hasFaded({}, Date.now())).toBe(false);
	});
});
