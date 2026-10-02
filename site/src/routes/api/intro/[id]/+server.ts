import { error, json } from '@sveltejs/kit';
import { heldIntro, holdIntro } from '$lib/server/intros';
import { modalVoice, OFF_AIR } from '$lib/server/modal-voice';
import type { RequestHandler } from './$types';

// audio/x-wav, not audio/wav: svelte-kit-sst's binary type list has a missing comma
// ("audio/wavaudio/webm"), so audio/wav bodies get mangled as UTF-8 text on Lambda
const wav = (body: Uint8Array | ArrayBuffer) =>
	new Response(body as BodyInit, { headers: { 'content-type': 'audio/x-wav', 'cache-control': 'private, max-age=3600' } });

/** Poll an Intro: 202 while Pete's voice is rendering, then the audio (held for an hour for Send). */
export const GET: RequestHandler = async ({ params }) => {
	if (!/^fc-[A-Za-z0-9]+$/.test(params.id)) error(404, 'No such Intro');

	const held = await heldIntro(params.id);
	if (held) return wav(held);

	const res = await modalVoice(`/renders/${params.id}`);
	if (res.status === 202) return json({ status: 'rendering' }, { status: 202 });
	if (res.status === 402) return json(OFF_AIR, { status: 402 });
	if (res.status === 404) error(404, 'No such Intro');
	if (!res.ok) error(502, 'Pete’s voice is unavailable right now');

	const audio = await res.arrayBuffer();
	await holdIntro(params.id, audio);
	return wav(audio);
};
