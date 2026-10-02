import { error } from '@sveltejs/kit';
import { wav } from '$lib/server/audio';
import { dedicationAudio } from '$lib/server/intros';
import { getDedication } from '$lib/server/dedications';
import type { RequestHandler } from './$types';

/** A Dedication's Intro. Short cache so a removed one (ticket 12) stops playing quickly. */
export const GET: RequestHandler = async ({ params }) => {
	const dedication = await getDedication(params.id);
	const audio = dedication && (await dedicationAudio(dedication.id));
	if (!audio) error(404, 'This Dedication has faded out');
	return wav(audio, 'private, max-age=60');
};
