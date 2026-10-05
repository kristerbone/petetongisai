import { redirect } from '@sveltejs/kit';
import { fadeDedication, getDedication, markOpened } from '$lib/server/dedications';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'private, no-store' });
	const dedication = await getDedication(params.id);
	if (!dedication) return { faded: true as const };
	await markOpened(dedication.id);
	return { faded: false as const, id: dedication.id, music: dedication.music };
};

export const actions: Actions = {
	/** "If this offended you, click here to remove it": a real POST, so link-preview bots can't. */
	remove: async ({ params }) => {
		const dedication = await getDedication(params.id);
		if (dedication) await fadeDedication(dedication.id);
		redirect(303, `/d/${params.id}`); // back to the plain link, now faded, so a refresh doesn't re-POST
	}
};
