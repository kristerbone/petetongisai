export type DeckId = 'A' | 'B';

export const decks = $state({
	A: { playing: false, bpm: 128.0, track: '— No track loaded —' },
	B: { playing: false, bpm: 128.0, track: '— No track loaded —' }
});
