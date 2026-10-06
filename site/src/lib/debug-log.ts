// Timestamped console logging to trace Spotify embed events and Track ID calls. Off unless asked for:
// in the browser run `localStorage.ptDebug = '1'` and reload (delete it to turn off); on the server
// it logs under `npm run dev` / `dev:sst` only.
const t0 = typeof performance !== 'undefined' ? performance.now() : 0;

const enabled = (() => {
	if (typeof window === 'undefined') return import.meta.env.DEV;
	try {
		return localStorage.getItem('ptDebug') === '1';
	} catch {
		return false;
	}
})();

export function dlog(scope: string, msg: string, data?: unknown) {
	if (!enabled) return;
	const t = ((performance.now() - t0) / 1000).toFixed(2).padStart(7);
	if (data === undefined) console.log(`[pt ${t}s] ${scope}: ${msg}`);
	else console.log(`[pt ${t}s] ${scope}: ${msg}`, data);
}

/** Log page/browser signals that could explain an unexplained pause, and every raw message the Spotify iframe posts. */
export function watchPageSignals() {
	if (!enabled || typeof window === 'undefined') return;
	const w = window as unknown as { __ptWatching?: boolean };
	if (w.__ptWatching) return;
	w.__ptWatching = true;
	document.addEventListener('visibilitychange', () => dlog('page', `visibility ${document.visibilityState}`));
	window.addEventListener('blur', () => dlog('page', 'window blur'));
	window.addEventListener('focus', () => dlog('page', 'window focus'));
	window.addEventListener('pagehide', () => dlog('page', 'pagehide'));
	window.addEventListener('message', (e) => {
		if (!e.origin.includes('spotify.com')) return;
		const d = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
		// playback_update is already logged in full; keep the rest, trimmed
		if (d.includes('playback_update')) return;
		dlog('spotify-msg', d.slice(0, 300));
	});
	try {
		navigator.mediaSession?.setActionHandler?.('pause', () => dlog('page', 'mediaSession pause (media key / OS)'));
	} catch {
		// Not supported
	}
}
