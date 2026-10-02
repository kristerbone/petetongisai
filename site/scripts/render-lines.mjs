#!/usr/bin/env node
// Render Pete's fixed lines once, in his voice, as static MP3s: the Jingles in src/lib/desk/jingles.json
// into static/jingles/<id>.mp3, and the Track ID pieces (openers, joiners, closers, generic lines) in
// src/lib/track-ids/lines.json into static/track-ids/<id>.mp3. Uses voice-service's render API with
// the Modal proxy token from the repo-root .env. Skips lines that already have a file; pass --force to
// re-render all, or ids to render just those. A line's optional "ref" picks the Reference Clip to try
// first (some takes land a word better), and "spoken" overrides the text sent to the voice. Needs ffmpeg.
//   node scripts/render-lines.mjs [--force] [id ...]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = process.env;
const headers = { 'Modal-Key': MODAL_PROXY_TOKEN_ID, 'Modal-Secret': MODAL_PROXY_TOKEN_SECRET };
const REFS = ['ref4', 'ref3', 'ref2']; // same order voice-service tries; each is a different take
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const pieces = json('../src/lib/track-ids/lines.json');
const sets = [
	{ dir: 'jingles', lines: json('../src/lib/desk/jingles.json') },
	{
		dir: 'track-ids',
		lines: [...pieces.openers, ...pieces.joiners, ...pieces.closers, ...pieces.genericLeads, ...pieces.genericFollows]
	}
];

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

for (const { dir, lines } of sets) {
	const outDir = new URL(`../static/${dir}/`, import.meta.url).pathname;
	mkdirSync(outDir, { recursive: true });
	for (const line of lines) {
		if (only.length && !only.includes(line.id)) continue;
		await renderLine(line, join(outDir, `${line.id}.mp3`));
	}
}

async function renderLine(line, mp3) {
	if (existsSync(mp3) && !force && !only.includes(line.id)) {
		console.log(`${line.id}: exists, skipping`);
		return;
	}
	let take;
	for (const ref of line.ref ? [line.ref, ...REFS.filter((r) => r !== line.ref)] : REFS) {
		take = await render(line.spoken ?? line.text, ref);
		console.log(`${line.id} [${ref}]: check ${take.checked} (coverage ${take.coverage})`);
		if (take.checked === 'pass') break;
	}
	if (take.checked !== 'pass') console.warn(`${line.id}: no take passed the check; keeping the last one, listen before shipping`);
	const wav = join(tmpdir(), `${line.id}.wav`);
	writeFileSync(wav, take.wav);
	// Even out loudness across lines, then a small mono MP3 for instant playback
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '44100', '-b:a', '96k', mp3]);
	rmSync(wav);
}
