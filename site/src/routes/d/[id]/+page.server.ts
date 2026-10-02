import { getDedication, markOpened } from '$lib/server/dedications';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'private, no-store' });
	const dedication = await getDedication(params.id);
	if (!dedication) return { faded: true as const };
	await markOpened(dedication.id);
	return { faded: false as const, id: dedication.id, spotifyUri: dedication.spotifyUri };
};
