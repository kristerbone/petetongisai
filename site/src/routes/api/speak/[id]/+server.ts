import { error, json } from '@sveltejs/kit';
import { modalVoice, OFF_AIR } from '$lib/server/modal-voice';
import type { RequestHandler } from './$types';

/** Poll a render: 202 while Pete's voice is rendering, then the audio. */
export const GET: RequestHandler = async ({ params }) => {
	if (!/^fc-[A-Za-z0-9]+$/.test(params.id)) error(404, 'No such render');
	const res = await modalVoice(`/renders/${params.id}`);
	if (res.status === 202) return json({ status: 'rendering' }, { status: 202 });
	if (res.status === 402) return json(OFF_AIR, { status: 402 });
	if (res.status === 404) error(404, 'No such render');
	if (!res.ok) error(502, 'Pete’s voice is unavailable right now');
	return new Response(await res.arrayBuffer(), {
		headers: {
			'content-type': 'audio/wav',
			'cache-control': 'private, max-age=3600',
			'x-voice-checked': res.headers.get('x-voice-checked') ?? ''
		}
	});
};
