export type IntroStatus = 'checking' | 'warming';
export type IntroResult =
	| { ok: true; id: string; audio: Blob }
	| { ok: false; reason: 'rejected' | 'rate-limited' | 'off-air' | 'error'; retryAfterS?: number; message?: string };

const POLL_MS = 1500;
const WARMING_AFTER_MS = 4000; // longer than a warm render: the GPU is cold-starting
const GIVE_UP_MS = 300_000; // a cold start plus a 500-character Intro, re-rendered clause by clause

/** Check and render an Intro via /api/intro, reporting progress until the audio is ready. */
export async function renderIntro(text: string, onStatus: (s: IntroStatus) => void): Promise<IntroResult> {
	onStatus('checking');
	const start = await fetch('/api/intro', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text })
	});
	if (start.status === 422) return { ok: false, reason: 'rejected' };
	if (start.status === 429) return { ok: false, reason: 'rate-limited', retryAfterS: (await start.json()).retryAfterS };
	if (start.status === 402) return { ok: false, reason: 'off-air' };
	if (!start.ok) return { ok: false, reason: 'error', message: (await start.json().catch(() => null))?.message };
	const { id } = await start.json();

	const began = Date.now();
	while (Date.now() - began < GIVE_UP_MS) {
		await new Promise((r) => setTimeout(r, POLL_MS));
		const res = await fetch(`/api/intro/${id}`);
		if (res.status === 202) {
			if (Date.now() - began > WARMING_AFTER_MS) onStatus('warming');
			continue;
		}
		if (res.status === 402) return { ok: false, reason: 'off-air' };
		if (!res.ok) return { ok: false, reason: 'error' };
		return { ok: true, id, audio: await res.blob() };
	}
	return { ok: false, reason: 'error', message: 'Pete took too long; try again' };
}
