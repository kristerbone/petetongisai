import STARTERS from './starters.json';

/** Occasion starters for the Intro box (ticket 16): each chip fills it with a line to edit. */
export const OCCASIONS = STARTERS;

const SLOT = /\[[^\]]*\]/;

/** Where the first "[name]"-style slot is, to select it so typing replaces it. */
export function firstSlot(text: string): { start: number; end: number } | null {
	const m = SLOT.exec(text);
	return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** A starter with a slot still unfilled: Pete would read out "name". */
export const hasSlot = (text: string) => SLOT.test(text);

/** A chip may replace the box's text without asking only if it's empty or an unedited starter. */
export const canReplaceSilently = (text: string, lastStarter: string | null) =>
	text.trim() === '' || text === lastStarter;
