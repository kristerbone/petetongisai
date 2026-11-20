#!/usr/bin/env node
// Make a PERMANENT Dedication, for the project's own social posts (never visitors'): renders the
// Intro in Pete's voice, then stores the Dedication so it never Fades and shows no remove button.
// The social/ folder drives this (`npm run dedicate` there); run directly it looks like:
//   node scripts/dedicate.mjs --text "Intro…" --music https://open.spotify.com/playlist/<id> --wav /tmp/x.wav
//   npm run sst -- shell --stage production -- node scripts/dedicate.mjs … --create
// Without --create it only renders (reusing --wav if it holds this exact text) so the audio can be
// listened to first. With --create it also writes the Dedication to the stage's table and bucket
// (needs AWS credentials, so run it inside `sst shell`) and prints `CREATED <id>`.
// Skips the public Play limit and Haiku check: it is our own text. Needs the repo-root .env for Modal.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
	options: { text: { type: 'string' }, music: { type: 'string' }, wav: { type: 'string' }, create: { type: 'boolean', default: false } }
});
const { text, music, wav, create } = values;
if (!text || text.length > 200) throw new Error('--text is required and at most 200 characters (the site’s Intro limit)');
if (!wav) throw new Error('--wav <file> is required (where the rendered Intro is kept for listening)');

// Mirror of lib/spotify/link.ts for the two kinds a post uses
const spotify = music?.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist)\/([A-Za-z0-9]{22})(?:[?#].*)?$/);
if (!spotify) throw new Error('--music must be a Spotify track or playlist link (open.spotify.com/…)');
const musicUri = `spotify:${spotify[1]}:${spotify[2]}`;

process.loadEnvFile(new URL('../../.env', import.meta.url).pathname);
const { MODAL_VOICE_URL, MODAL_PROXY_TOKEN_ID, MODAL_PROXY_TOKEN_SECRET } = process.env;
const headers = { 'Modal-Key': MODAL_PROXY_TOKEN_ID, 'Modal-Secret': MODAL_PROXY_TOKEN_SECRET };
const REFS = ['ref4', 'ref3', 'ref2']; // each is a different take; try in turn if words get dropped

async function render(line, ref) {
	const start = await fetch(`${MODAL_VOICE_URL}/renders`, {
		method: 'POST',
		headers: { ...headers, 'content-type': 'application/json' },
		body: JSON.stringify({ text: line, ref })
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
		return { audio: Buffer.from(await res.arrayBuffer()), checked: res.headers.get('x-voice-checked') };
	}
}

// Reuse the saved take only if it was made from exactly this text
const meta = `${wav}.json`;
const saved = existsSync(wav) && existsSync(meta) && JSON.parse(readFileSync(meta, 'utf8')).text === text;
if (saved) {
	console.error(`reusing ${wav}`);
} else {
	let take;
	for (const ref of REFS) {
		take = await render(text, ref);
		console.error(`[${ref}] check ${take.checked}`);
		if (take.checked === 'pass') break;
	}
	if (take.checked !== 'pass') console.error('No take passed the check; listen before creating.');
	writeFileSync(wav, take.audio);
	writeFileSync(meta, JSON.stringify({ text, checked: take.checked }));
	console.error(`wrote ${wav}`);
}

if (create) {
	// Loaded only now: they need `sst shell` credentials and linked resources
	const { Resource } = await import('sst');
	const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
	const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
	const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
	// Same as dedications.ts: 128 random bits, URL-safe
	const id = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
	await new S3Client({}).send(
		new PutObjectCommand({ Bucket: Resource.Intros.name, Key: `dedications/${id}.wav`, Body: readFileSync(wav), ContentType: 'audio/wav' })
	);
	await DynamoDBDocumentClient.from(new DynamoDBClient({})).send(
		new PutCommand({
			TableName: Resource.Dedications.name,
			// No fadesAt: DynamoDB's TTL never touches it, and permanent hides the remove button
			Item: { id, introId: 'permanent', music: musicUri, createdAt: Date.now(), lastOpenedAt: null, permanent: true },
			ConditionExpression: 'attribute_not_exists(id)'
		})
	);
	console.log(`CREATED ${id}`);
}
