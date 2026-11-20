// Start a new show: copies the last show's posts as a starting point, clears the links and the
// Dedication intros, and leaves the captions and Pete's lines to rewrite.
//   node new-show.mjs 2026-11-27
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { listShows, postsDir } from './lib.mjs';

const id = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(id ?? '')) {
	console.error('Usage: npm run new -- YYYY-MM-DD   (the Friday of the show)');
	process.exit(1);
}
const target = path.join(postsDir, id);
if (existsSync(target)) {
	console.error(`${id} already exists`);
	process.exit(1);
}
const last = listShows().at(-1);
cpSync(path.join(postsDir, last), target, { recursive: true });
for (const f of readdirSync(target).filter((f) => /^\d\d-.+\.json$/.test(f))) {
	const file = path.join(target, f);
	const post = JSON.parse(readFileSync(file, 'utf8'));
	post.playlist = '';
	post.playlistName = '';
	post.playlistUrl = '';
	post.dedicationUrl = '';
	post.dedicationIntro = '';
	writeFileSync(file, JSON.stringify(post, null, '\t') + '\n');
}
console.log(`Created posts/${id} from ${last}. Edit the posts, then: npm run review -- ${id}`);
