// Create the next numbered post in posts/:
//   node new-post.mjs <name> [--from 002] [--card up|on|off|image]
// With --from it copies that post as a starting point (links and Dedication intro cleared); otherwise it
// starts from a blank template. Then edit the file and run `npm run review -- <number>`.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadPosts, postsDir, CARDS, POST_DEFAULTS } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : undefined;
};
const name = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!name || !/^[a-z0-9-]+$/.test(name)) {
	console.error('Usage: npm run new -- <name> [--from 002] [--card up|on|off|image]   (name: lowercase letters, numbers, dashes)');
	process.exit(1);
}
const last = Math.max(0, ...readdirSync(postsDir).map((f) => Number(f.match(/^(\d{3})-/)?.[1] ?? 0)));
const id = `${String(last + 1).padStart(3, '0')}-${name}`;

let post;
const from = flag('from');
if (from) {
	const src = loadPosts().find((p) => p.id === from || p.id.startsWith(`${from}-`));
	if (!src) throw new Error(`No post "${from}"`);
	post = JSON.parse(readFileSync(path.join(postsDir, `${src.id}.json`), 'utf8'));
	Object.assign(post, { playlist: '', playlistName: '', playlistUrl: '', dedicationIntro: '', dedicationUrl: '' });
	post.notes = [];
} else {
	const card = flag('card') ?? 'up';
	if (!CARDS[card]) throw new Error(`--card must be one of ${Object.keys(CARDS).join(', ')}`);
	post = { ...structuredClone(POST_DEFAULTS), card };
}
writeFileSync(path.join(postsDir, `${id}.json`), JSON.stringify(post, null, '\t') + '\n');
console.log(`Created posts/${id}.json. Edit it, then: npm run review -- ${id.slice(0, 3)}`);
