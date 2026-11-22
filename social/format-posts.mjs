// Bring every post file to the same schema: all fields present, in the same order (see POST_DEFAULTS in lib.mjs).
// Missing fields get their default; unknown fields are reported and kept at the end. Run after editing by hand.
//   node format-posts.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { POST_DEFAULTS, postsDir } from './lib.mjs';

for (const f of readdirSync(postsDir).filter((f) => /^\d{3}-.+\.json$/.test(f)).sort()) {
	const file = path.join(postsDir, f);
	const post = JSON.parse(readFileSync(file, 'utf8'));
	const out = {};
	for (const [k, v] of Object.entries(POST_DEFAULTS)) out[k] = post[k] ?? structuredClone(v);
	out.caption = { ...POST_DEFAULTS.caption, ...out.caption };
	const unknown = Object.keys(post).filter((k) => !(k in POST_DEFAULTS));
	for (const k of unknown) out[k] = post[k];
	const text = JSON.stringify(out, null, '\t') + '\n';
	if (text !== readFileSync(file, 'utf8')) {
		writeFileSync(file, text);
		console.log(`formatted ${f}`);
	}
	if (unknown.length) console.warn(`${f}: unknown field(s) ${unknown.join(', ')}`);
}
