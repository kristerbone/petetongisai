// Render each post's videoLine in Pete's (synthesised) voice to audio/<post>.wav:
//   node render-audio.mjs [--force] [001 002 ...]     (default: all posts that have a videoLine)
// Uses the voice service with the Modal proxy token from the repo-root .env, the same way
// site/scripts/render-lines.mjs does. Skips posts that already have a file unless --force or named.
// If a line changed since its audio was rendered, re-run with --force or the post id. Needs ffmpeg.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { audioPath, pickPosts } from './lib.mjs';

process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = process.env;
const headers = { 'Modal-Key': MODAL_PROXY_TOKEN_ID, 'Modal-Secret': MODAL_PROXY_TOKEN_SECRET };
const REFS = ['ref4', 'ref3', 'ref2']; // each is a different take; try in turn if words get dropped
const args = process.argv.slice(2);
const force = args.includes('--force');
const [posts, , explicit] = pickPosts(args.filter((a) => !a.startsWith('--')));

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
		return { wav: Buffer.from(await res.arrayBuffer()), checked: res.headers.get('x-voice-checked') };
	}
}

for (const post of posts) {
	if (!post.videoLine) {
		console.log(`${post.id}: no videoLine, skipping`);
		continue;
	}
	const target = audioPath(post.id);
	if (existsSync(target) && !force && !explicit) {
		console.log(`${post.id}: exists, skipping`);
		continue;
	}
	mkdirSync(path.dirname(target), { recursive: true });
	let take;
	for (const ref of REFS) {
		take = await render(post.videoLine, ref);
		console.log(`${post.id} [${ref}]: check ${take.checked}`);
		if (take.checked === 'pass') break;
	}
	if (take.checked !== 'pass') console.warn(`${post.id}: no take passed the check; listen before posting`);
	const raw = path.join(tmpdir(), `social-${post.id}.wav`);
	writeFileSync(raw, take.wav);
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5', '-ac', '1', '-ar', '44100', target]);
	rmSync(raw);
	console.log(`wrote ${path.relative(process.cwd(), target)}`);
}
