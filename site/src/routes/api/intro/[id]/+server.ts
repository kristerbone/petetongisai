import { error, json } from '@sveltejs/kit';
import { wav } from '$lib/server/audio';
import { heldIntro, holdIntro } from '$lib/server/intros';
import { modalVoice, OFF_AIR } from '$lib/server/modal-voice';
import type { RequestHandler } from './$types';

/** Poll an Intro: 202 while Pete's voice is rendering, then the audio (held for an hour for Send). */
export const GET: RequestHandler = async ({ params }) => {
	if (!/^fc-[A-Za-z0-9]+$/.test(params.id)) error(404, 'No such Intro');

	const held = await heldIntro(params.id);
	if (held) return wav(held, 'private, max-age=3600');

	const res = await modalVoice(`/renders/${params.id}`);
	if (res.status === 202) return json({ status: 'rendering' }, { status: 202 });
	if (res.status === 402) return json(OFF_AIR, { status: 402 });
	if (res.status === 404) error(404, 'No such Intro');
	if (!res.ok) error(502, 'Pete’s voice is unavailable right now');

	const audio = await res.arrayBuffer();
	await holdIntro(params.id, audio);
	return wav(audio, 'private, max-age=3600');
};
