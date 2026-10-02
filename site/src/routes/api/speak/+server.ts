import { error, json } from '@sveltejs/kit';
import { modalVoice, OFF_AIR } from '$lib/server/modal-voice';
import type { RequestHandler } from './$types';

const MAX_CHARS = 200;

/** Start rendering a line in Pete's voice. Returns { id } to poll at /api/speak/[id]. */
export const POST: RequestHandler = async ({ request }) => {
	const { text } = await request.json().catch(() => ({}));
	if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARS) {
		error(400, `Text must be 1–${MAX_CHARS} characters`);
	}
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
