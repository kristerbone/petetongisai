import { env } from '$env/dynamic/private';
import { dlog } from '$lib/debug-log';

/** Calls voice-service's render API. The proxy token stays on the server. */
export function modalVoice(path: string, init: RequestInit = {}) {
	const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = env;
	if (!MODAL_VOICE_URL || !MODAL_PROXY_TOKEN_ID || !MODAL_PROXY_TOKEN_SECRET) {
		throw new Error('Modal voice is not configured (MODAL_VOICE_URL / MODAL_PROXY_TOKEN_*)');
	}
	const label = `modal ${init.method ?? 'GET'} ${path}`;
	const began = Date.now();
	dlog('server', `${label} ->`);
	return fetch(`${MODAL_VOICE_URL}${path}`, {
		...init,
		headers: {
			...init.headers,
			'Modal-Key': MODAL_PROXY_TOKEN_ID,
			'Modal-Secret': MODAL_PROXY_TOKEN_SECRET
		}
	}).then(
		(res) => {
			dlog('server', `${label} <- ${res.status} in ${Date.now() - began}ms`);
			return res;
		},
		(e) => {
			dlog('server', `${label} FAILED after ${Date.now() - began}ms`, e);
			throw e;
		}
	);
}

/** voice-service answers 402 when Modal refuses work because the monthly spending cap is reached. */
export const OFF_AIR = { error: 'budget' } as const;
