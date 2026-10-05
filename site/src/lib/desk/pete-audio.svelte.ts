/**
 * Pete never talks over the music (ADR 0001). The Jingles and the Play panel share this:
 * while a Jingle plays the embed pauses, and Jingles wait while an Intro or a Track ID is on.
 * It's reactive state, so the On Air and Tunes lamps can follow it.
 */
type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();

export const pete = $state({
	/** An Intro, Track ID or Sign-off is playing (Jingles wait for these) */
	speaking: false,
	/** A Jingle is playing */
	jingle: false,
	/** The Spotify embed is playing */
	music: false
});

/** Leaving a page tears down its player and audio without a word, so its lamps must go dark with it. */
export function resetPete() {
	pete.speaking = false;
	pete.jingle = false;
	pete.music = false;
}

export function onJingle(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function jingleSpeaking(speaking: boolean) {
	pete.jingle = speaking;
	for (const listener of listeners) listener(speaking);
}
