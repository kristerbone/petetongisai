export const PLAYS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

/** Sliding one-hour window: decide whether one more hit is allowed, given earlier hit times (ms). */
export function decide(hits: number[], now: number, limit = PLAYS_PER_HOUR) {
	const recent = hits.filter((t) => t > now - WINDOW_MS).sort((a, b) => a - b);
	if (recent.length >= limit) {
		return { allowed: false as const, hits: recent, retryAfterS: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
	}
	return { allowed: true as const, hits: [...recent, now], retryAfterS: 0 };
}

/**
 * The visitor's rate-limit key from CloudFront's Viewer-Address header ("ip:port"), which
 * CloudFront sets itself. X-Forwarded-For reaches the Lambda exactly as the client sent it, so
 * it can't be trusted. IPv6 visitors are keyed by their /64, which one household usually shares.
 */
export function clientKey(viewerAddress: string | null, fallback: string): string {
	const ip = viewerAddress ? viewerAddress.slice(0, viewerAddress.lastIndexOf(':')) : fallback;
	if (!ip.includes(':')) return ip;
	const groups = expandIpv6(ip.replace(/^\[|\]$/g, ''));
	return groups ? `${groups.slice(0, 4).join(':')}::/64` : ip;
}

function expandIpv6(ip: string): string[] | null {
	const [head, tail] = ip.split('::');
	const h = head ? head.split(':') : [];
	const t = tail !== undefined && tail !== '' ? tail.split(':') : [];
	const missing = 8 - h.length - t.length;
	if (missing < 0 || (tail === undefined && missing !== 0)) return null;
	return [...h, ...Array(missing).fill('0'), ...t].map((g) => g.toLowerCase().replace(/^0+(?=.)/, ''));
}
