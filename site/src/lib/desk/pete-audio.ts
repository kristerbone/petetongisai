/**
 * Pete never talks over the music (ADR 0001). The Jingles and the Play panel share this:
 * while a Jingle plays the embed pauses, and Jingles wait while an Intro is on.
 */
type Listener = (speaking: boolean) => void;
const listeners = new Set<Listener>();

export const pete = { introPlaying: false };

export function onJingle(listener: Listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function jingleSpeaking(speaking: boolean) {
	for (const listener of listeners) listener(speaking);
}
