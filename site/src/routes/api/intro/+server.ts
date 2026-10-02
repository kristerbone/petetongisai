import { error, json } from '@sveltejs/kit';
import { checkIntro } from '$lib/server/intro-check';
import { modalVoice, OFF_AIR } from '$lib/server/modal-voice';
import { hitPlayLimit } from '$lib/server/rate-limit';
import { clientKey } from '$lib/server/rate-limit-window';
import type { RequestHandler } from './$types';

const MAX_CHARS = 500; // voice-service takes up to 600

/**
 * Play with text: count it against the IP's hourly limit, have Haiku check it, then start
 * rendering Pete's Intro. Returns { id } to poll at /api/intro/[id].
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const { text } = await request.json().catch(() => ({}));
	if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARS) {
		error(400, `Text must be 1–${MAX_CHARS} characters`);
	}

	// Counted before the check, so rejected text still uses up a Play
	const limit = await hitPlayLimit(clientKey(request.headers.get('cloudfront-viewer-address'), getClientAddress()));
	if (!limit.allowed) {
		return json({ error: 'rate-limited', retryAfterS: limit.retryAfterS }, { status: 429 });
	}

	let allowed: boolean;
	try {
		allowed = await checkIntro(text.trim());
	} catch (e) {
		console.error('Intro check failed', e);
		error(503, 'Pete can’t check that right now; try again in a moment');
	}
	if (!allowed) return json({ error: 'rejected' }, { status: 422 });

	const res = await modalVoice('/renders', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text: text.trim() })
	});
	if (res.status === 402) return json(OFF_AIR, { status: 402 });
	if (!res.ok) error(502, 'Pete’s voice is unavailable right now');
	const { id } = await res.json();
	return json({ id }, { status: 202 });
};
