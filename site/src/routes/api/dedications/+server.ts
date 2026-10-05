import { error, json } from '@sveltejs/kit';
import { createDedication, DedicationRemoved } from '$lib/server/dedications';
import { isIntroHeld } from '$lib/server/intros';
import { parseMusicLink } from '$lib/music/link';
import type { RequestHandler } from './$types';

/**
 * Send: turn the Intro just played into a Dedication. Needs a held Intro, so Play alone
 * (no text) never stores anything, and nothing is rendered again.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const { introId, music } = await request.json().catch(() => ({}));
	if (typeof introId !== 'string' || !/^fc-[A-Za-z0-9]+$/.test(introId)) error(400, 'Send needs an Intro');
	const link = music ? parseMusicLink(String(music)) : null;
	if (music && !link) error(400, 'That’s not a Spotify track, playlist or Mixcloud show link');
	if (!(await isIntroHeld(introId))) error(410, 'That Intro has expired; press Play again to make a new one');

	let id: string;
	try {
		id = await createDedication(introId, link?.uri ?? null);
	} catch (e) {
		if (e instanceof DedicationRemoved) error(410, 'That Dedication was removed; press Play to make a new one');
		throw e;
	}
	return json({ id, url: new URL(`/d/${id}`, url).toString() }, { status: 201 });
};
