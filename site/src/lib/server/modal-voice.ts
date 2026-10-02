import { env } from '$env/dynamic/private';

/** Calls voice-service's render API. The proxy token stays on the server. */
export function modalVoice(path: string, init: RequestInit = {}) {
	const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = env;
	if (!MODAL_VOICE_URL || !MODAL_PROXY_TOKEN_ID || !MODAL_PROXY_TOKEN_SECRET) {
		throw new Error('Modal voice is not configured (MODAL_VOICE_URL / MODAL_PROXY_TOKEN_*)');
	}
	return fetch(`${MODAL_VOICE_URL}${path}`, {
		...init,
		headers: {
			...init.headers,
			'Modal-Key': MODAL_PROXY_TOKEN_ID,
			'Modal-Secret': MODAL_PROXY_TOKEN_SECRET
		}
	});
}

/** voice-service answers 402 when Modal refuses work because the monthly spending cap is reached. */
export const OFF_AIR = { error: 'budget' } as const;
