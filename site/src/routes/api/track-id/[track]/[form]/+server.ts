import { error, json } from '@sveltejs/kit';
import { wav } from '$lib/server/audio';
import { clientKey } from '$lib/server/rate-limit-window';
import { trackIdLine } from '$lib/server/track-ids';
import { FORMS, type Form } from '$lib/track-ids/lines';
import type { RequestHandler } from './$types';

/**
 * A Spotify track's Track ID line in Pete's voice (ticket 13). Starts rendering it the first time
 * anyone asks, then answers 202 until it's ready. 204 means "say a generic line instead".
 */
export const GET: RequestHandler = async ({ params, request, getClientAddress }) => {
	if (!/^[A-Za-z0-9]{22}$/.test(params.track) || !FORMS.includes(params.form as Form)) error(404, 'No such Track ID');

	const ip = clientKey(request.headers.get('cloudfront-viewer-address'), getClientAddress());
	const line = await trackIdLine(params.track, params.form as Form, ip);
	if (line.status === 'ready') return wav(line.audio, 'public, max-age=86400');
	if (line.status === 'rendering') return json({ status: 'rendering' }, { status: 202, headers: { 'cache-control': 'no-store' } });
	return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-generic-reason': line.reason } });
};
