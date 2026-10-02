import SIGN_OFFS from './sign-offs.json';

const KEY = 'pt-sign-off';

/**
 * The next Sign-off for this listener, rotating so a repeat listener hears a different one each
 * time. Pre-rendered once by scripts/render-lines.mjs into /sign-offs/<id>.mp3.
 */
export function nextSignOff(): string {
	let i = Math.floor(Math.random() * SIGN_OFFS.length);
	try {
		const last = Number(localStorage.getItem(KEY));
		if (localStorage.getItem(KEY) !== null && Number.isInteger(last)) i = (last + 1) % SIGN_OFFS.length;
		localStorage.setItem(KEY, String(i));
	} catch {
		// Storage blocked (private mode, say): a random one will do
	}
	return `/sign-offs/${SIGN_OFFS[i].id}.mp3`;
}
