#!/usr/bin/env node
// Render every Jingle in src/lib/desk/jingles.json once, in Pete's voice, into static/jingles/<id>.mp3.
// Uses voice-service's render API with the Modal proxy token from the repo-root .env. Skips Jingles
// that already have a file; pass --force to re-render all. A Jingle's optional "ref" picks the
// Reference Clip to try first (some takes land a word better). Needs ffmpeg.
//   node scripts/render-jingles.mjs [--force]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = process.env;
const headers = { 'Modal-Key': MODAL_PROXY_TOKEN_ID, 'Modal-Secret': MODAL_PROXY_TOKEN_SECRET };
const REFS = ['ref4', 'ref3', 'ref2']; // same order voice-service tries; each is a different take
const force = process.argv.includes('--force');

const jingles = JSON.parse(readFileSync(new URL('../src/lib/desk/jingles.json', import.meta.url)));
const outDir = new URL('../static/jingles/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

async function render(text, ref) {
	const start = await fetch(`${MODAL_VOICE_URL}/renders`, {
		method: 'POST',
		headers: { ...headers, 'content-type': 'application/json' },
		body: JSON.stringify({ text, ref })
	});
	if (!start.ok) throw new Error(`start ${start.status}: ${await start.text()}`);
	const { id } = await start.json();
	for (;;) {
		const res = await fetch(`${MODAL_VOICE_URL}/renders/${id}`, { headers });
		if (res.status === 202) {
			await new Promise((r) => setTimeout(r, 2000));
			continue;
		}
		if (!res.ok) throw new Error(`render ${res.status}: ${await res.text()}`);
		return { wav: Buffer.from(await res.arrayBuffer()), checked: res.headers.get('x-voice-checked'), coverage: res.headers.get('x-voice-coverage') };
	}
}

for (const jingle of jingles) {
	const mp3 = join(outDir, `${jingle.id}.mp3`);
	if (existsSync(mp3) && !force) {
		console.log(`${jingle.id}: exists, skipping`);
		continue;
	}
	let take;
	for (const ref of jingle.ref ? [jingle.ref, ...REFS.filter((r) => r !== jingle.ref)] : REFS) {
		take = await render(jingle.spoken ?? jingle.text, ref);
		console.log(`${jingle.id} [${ref}]: check ${take.checked} (coverage ${take.coverage})`);
		if (take.checked === 'pass') break;
	}
	if (take.checked !== 'pass') console.warn(`${jingle.id}: no take passed the check; keeping the last one, listen before shipping`);
	const wav = join(tmpdir(), `${jingle.id}.wav`);
	writeFileSync(wav, take.wav);
	// Even out loudness across Jingles, then a small mono MP3 for instant playback
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '44100', '-b:a', '96k', mp3]);
	rmSync(wav);
}
