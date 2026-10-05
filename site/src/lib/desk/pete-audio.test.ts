import { describe, expect, it } from 'vitest';
import { jingleSpeaking, pete, resetPete } from './pete-audio.svelte';

describe('the lamps state', () => {
	it('goes dark when a page is left, so the Tunes lamp does not stay lit on the next page', () => {
		pete.music = true; // a dedication's music was playing when the listener went to the desk
		pete.speaking = true;
		jingleSpeaking(true);

		resetPete();

		expect(pete).toEqual({ speaking: false, jingle: false, music: false });
	});
});
