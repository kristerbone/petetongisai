import { error, json } from '@sveltejs/kit';
import { playlistTracks } from '$lib/server/playlist';
import type { RequestHandler } from './$types';

/** A playlist's playable track ids and durations, so Track IDs can tell which track is on. */
export const GET: RequestHandler = async ({ params }) => {
	if (!/^[A-Za-z0-9]{22}$/.test(params.id)) error(404, 'No such playlist');
	const tracks = await playlistTracks(params.id);
	if (!tracks) error(502, 'Couldn’t read that playlist');
	return json(tracks, { headers: { 'cache-control': 'public, max-age=300' } });
};
