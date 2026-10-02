import { describe, expect, it } from 'vitest';
import { canReplaceSilently, firstSlot, hasSlot, OCCASIONS } from './starters';

describe('occasion starters', () => {
	it('has eight occasions with three short lines each, every one with a slot to fill', () => {
		expect(OCCASIONS.map((o) => o.label)).toEqual([
			'Birthday', 'Wedding', 'Anniversary', 'Stag do', 'Hen do', 'Work do', 'Leaving do', 'Just because'
		]);
		for (const o of OCCASIONS) {
			expect(o.lines).toHaveLength(3);
			for (const line of o.lines) {
				expect(hasSlot(line)).toBe(true);
				expect(line.length).toBeLessThanOrEqual(120);
				expect(line).not.toMatch(/…|\.\.\./); // the voice stumbles on ellipses
			}
		}
	});

	it('finds the first slot to select', () => {
		const text = 'This one goes out to [name] and [name].';
		expect(text.slice(firstSlot(text)!.start, firstSlot(text)!.end)).toBe('[name]');
		expect(firstSlot(text)!.start).toBe(21);
		expect(firstSlot('Happy birthday, Sam!')).toBeNull();
	});

	it('blocks Play while any slot is left, whatever its name', () => {
		expect(hasSlot('To everyone at [team]: turn it up.')).toBe(true);
		expect(hasSlot('To Sam and [name]: happy anniversary')).toBe(true);
		expect(hasSlot('To Sam and Alex: happy anniversary')).toBe(false);
	});

	it('replaces only an empty box or an unedited starter without asking', () => {
		const starter = 'Happy birthday, [name]!';
		expect(canReplaceSilently('', null)).toBe(true);
		expect(canReplaceSilently('  ', null)).toBe(true);
		expect(canReplaceSilently(starter, starter)).toBe(true);
		expect(canReplaceSilently('Happy birthday, Sam!', starter)).toBe(false);
		expect(canReplaceSilently('My own words', null)).toBe(false);
	});
});
