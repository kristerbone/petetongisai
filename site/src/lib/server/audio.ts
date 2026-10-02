// audio/x-wav, not audio/wav: svelte-kit-sst's binary type list has a missing comma
// ("audio/wavaudio/webm"), so audio/wav bodies get mangled as UTF-8 text on Lambda
export const wav = (body: Uint8Array | ArrayBuffer, cacheControl: string) =>
	new Response(body as BodyInit, { headers: { 'content-type': 'audio/x-wav', 'cache-control': cacheControl } });
