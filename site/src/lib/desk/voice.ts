/** Browser text-to-speech: still used by the Jingle buttons until ticket 09 gives them Pete's voice. */
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

export type PeteStatus = 'starting' | 'warming' | 'playing' | 'done' | 'off-air' | 'error';

const POLL_MS = 1500;
const WARMING_AFTER_MS = 4000; // longer than a warm render: the GPU is cold-starting
const GIVE_UP_MS = 180_000;

let current: HTMLAudioElement | null = null;

/** Speak a line in Pete's (AI) voice via /api/speak, reporting progress through onStatus. */
export async function speakAsPete(text: string, onStatus: (s: PeteStatus, detail?: string) => void) {
	window.speechSynthesis?.cancel();
	current?.pause();
	onStatus('starting');

	const start = await fetch('/api/speak', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text })
	});
	if (start.status === 402) return onStatus('off-air');
	if (!start.ok) return onStatus('error', (await start.json().catch(() => null))?.message);
	const { id } = await start.json();

	const began = Date.now();
	while (Date.now() - began < GIVE_UP_MS) {
		await new Promise((r) => setTimeout(r, POLL_MS));
		const res = await fetch(`/api/speak/${id}`);
		if (res.status === 202) {
			if (Date.now() - began > WARMING_AFTER_MS) onStatus('warming');
			continue;
		}
		if (res.status === 402) return onStatus('off-air');
		if (!res.ok) return onStatus('error');

		const audio = new Audio(URL.createObjectURL(await res.blob()));
		current = audio;
		audio.onended = () => onStatus('done');
		onStatus('playing');
		await audio.play().catch(() => onStatus('error', 'Your browser blocked playback; press Speak again'));
		return;
	}
	onStatus('error', 'Pete took too long; try again');
}
