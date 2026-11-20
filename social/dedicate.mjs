// Make each post's permanent Dedication on the site, and write its link into dedicationUrl:
//   node dedicate.mjs [show] [post-id ...]            render each Intro for listening (no site changes)
//   node dedicate.mjs [show] [post-id ...] --create   also create the permanent Dedication on production
// A post is picked up when it has a dedicationIntro and playlistUrl and no dedicationUrl yet.
// The rendered Intros are kept in audio/<show>/<post>-dedication.wav: listen first, edit the text and
// re-run (a changed text is re-rendered, the same text reuses the take you heard), then --create.
// --create needs AWS credentials for the project (the `petetongisai` profile, via site/scripts/with-aws.sh).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { audioPath, here, loadShow, pickShow, postsDir } from './lib.mjs';

const SITE = 'https://petetongisai.com';
const argv = process.argv.slice(2);
const create = argv.includes('--create');
const [showId, only] = pickShow(argv.filter((a) => !a.startsWith('--')));
const { posts } = loadShow(showId);
const siteDir = path.join(here, '..', 'site');
let done = 0;

for (const post of posts) {
	if (only.length && !only.includes(post.id)) continue;
	if (post.dedicationUrl) {
		console.log(`${post.id}: already has a Dedication, skipping`);
		continue;
	}
	if (!post.dedicationIntro || !post.playlistUrl) {
		console.log(`${post.id}: needs dedicationIntro and playlistUrl first, skipping`);
		continue;
	}
	const wav = audioPath(showId, `${post.id}-dedication`);
	mkdirSync(path.dirname(wav), { recursive: true });
	const script = path.join(siteDir, 'scripts', 'dedicate.mjs');
	const args = [script, '--text', post.dedicationIntro, '--music', post.playlistUrl, '--wav', wav];
	if (!create) {
		execFileSync('node', args, { stdio: 'inherit' });
		console.log(`${post.id}: rendered ${path.relative(process.cwd(), wav)}. Listen, then run again with --create.`);
		continue;
	}
	const out = execFileSync(
		'npm',
		['--prefix', siteDir, 'run', 'sst', '--', 'shell', '--stage', 'production', '--', 'node', ...args, '--create'],
		{ stdio: ['inherit', 'pipe', 'inherit'] }
	).toString();
	const id = out.match(/^CREATED (\S{22})$/m)?.[1];
	if (!id) throw new Error(`${post.id}: no Dedication id came back:\n${out}`);
	// Save the link straight away, so a later failure can't leave a Dedication we lose track of
	const file = path.join(postsDir, showId, `${post.id}.json`);
	const json = JSON.parse(readFileSync(file, 'utf8'));
	json.dedicationUrl = `${SITE}/d/${id}`;
	writeFileSync(file, JSON.stringify(json, null, '\t') + '\n');
	console.log(`${post.id}: ${json.dedicationUrl}`);
	done++;
}
if (create) console.log(`\nCreated ${done} permanent Dedication${done === 1 ? '' : 's'}. Run npm run review to check the posts.`);
