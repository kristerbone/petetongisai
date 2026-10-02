export type ListedTrack = { trackId: string; durationMs: number };

// The embed's reported duration wobbles by a few tens of milliseconds
const TOLERANCE_MS = 1000;

/**
 * Which playlist track is playing, when the embed only reports its duration (signed-in listeners).
 * Prefers the next unplayed track after the last one matched, so it follows the playlist in order,
 * but also finds a track elsewhere (shuffle, or a skip). Null when nothing fits.
 */
export function matchTrack(list: ListedTrack[], durationMs: number, after: number, played: Set<number>): number | null {
	const fits = (i: number) => !played.has(i) && Math.abs(list[i].durationMs - durationMs) <= TOLERANCE_MS;
	for (let i = after + 1; i < list.length; i++) if (fits(i)) return i;
	for (let i = 0; i <= after && i < list.length; i++) if (fits(i)) return i;
	return null;
}
