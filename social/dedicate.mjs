// Make each post's permanent Dedication on the site, and write its link into dedicationUrl:
//   node dedicate.mjs [001 002 ...]            render each Intro for listening (no site changes)
//   node dedicate.mjs 001 002 --create         also create those permanent Dedications on production
//   node dedicate.mjs --all --create           ...for every post that is ready (--create needs post numbers or --all)
// A post is picked up when it has a dedicationIntro and playlistUrl and no dedicationUrl yet.
// The rendered Intros are kept in audio/<post>-dedication.wav: listen first, edit the text and
// re-run (a changed text is re-rendered, the same text reuses the take you heard), then --create.
// --create needs AWS credentials for the project (the `petetongisai` profile, via site/scripts/with-aws.sh).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { audioPath, here, pickPosts, postsDir } from './lib.mjs';

const SITE = 'https://petetongisai.com';
const argv = process.argv.slice(2);
const create = argv.includes('--create');
const [posts, , explicit] = pickPosts(argv.filter((a) => !a.startsWith('--')));
if (create && !explicit && !argv.includes('--all')) {
	console.error('--create needs post numbers (e.g. 001 002) or --all, so it never makes Dedications by surprise');
	process.exit(1);
}
const siteDir = path.join(here, '..', 'site');
let done = 0;

for (const post of posts) {
	if (post.dedicationUrl) {
		console.log(`${post.id}: already has a Dedication, skipping`);
		continue;
	}
	if (!post.dedicationIntro || !post.playlistUrl) {
		console.log(`${post.id}: needs dedicationIntro and playlistUrl first, skipping`);
		continue;
	}
	const wav = audioPath(`${post.id}-dedication`);
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
	const file = path.join(postsDir, `${post.id}.json`);
	const json = JSON.parse(readFileSync(file, 'utf8'));
	json.dedicationUrl = `${SITE}/d/${id}`;
	writeFileSync(file, JSON.stringify(json, null, '\t') + '\n');
	console.log(`${post.id}: ${json.dedicationUrl}`);
	done++;
}
if (create) console.log(`\nCreated ${done} permanent Dedication${done === 1 ? '' : 's'}. Run npm run review to check the posts.`);
