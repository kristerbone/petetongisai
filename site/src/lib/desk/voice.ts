/**
 * Speak a line as Pete. Browser text-to-speech for now; ticket 08 swaps this
 * for Pete's voice from voice-service/ (called server-side).
 */
export function speak(text: string) {
	const synth = window.speechSynthesis;
	if (!synth) return;
	synth.cancel();

	const utt = new SpeechSynthesisUtterance(text);
	const voices = synth.getVoices();
	const british = voices.find((v) => v.lang === 'en-GB') || voices[0];
	if (british) utt.voice = british;
	utt.rate = 0.95;
	utt.pitch = 0.85;
	utt.volume = 1.0;

	synth.speak(utt);
}

/** Some browsers only populate the voice list after a first call. */
export function warmUpVoices() {
	window.speechSynthesis?.getVoices();
}
