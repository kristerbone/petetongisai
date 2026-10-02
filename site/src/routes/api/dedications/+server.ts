import { error, json } from '@sveltejs/kit';
import { createDedication } from '$lib/server/dedications';
import { isIntroHeld } from '$lib/server/intros';
import { parseSpotifyLink } from '$lib/spotify/link';
import type { RequestHandler } from './$types';

/**
 * Send: turn the Intro just played into a Dedication. Needs a held Intro, so Play alone
 * (no text) never stores anything, and nothing is rendered again.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const { introId, spotifyUri } = await request.json().catch(() => ({}));
	if (typeof introId !== 'string' || !/^fc-[A-Za-z0-9]+$/.test(introId)) error(400, 'Send needs an Intro');
	const link = spotifyUri ? parseSpotifyLink(String(spotifyUri)) : null;
	if (spotifyUri && !link) error(400, 'That’s not a Spotify track or playlist link');
	if (!(await isIntroHeld(introId))) error(410, 'That Intro has expired; press Play again to make a new one');

	const id = await createDedication(introId, link?.uri ?? null);
	return json({ id, url: new URL(`/d/${id}`, url).toString() }, { status: 201 });
};
