// Print posts for review, with placeholders filled in and a list of what is still missing:
//   node review.mjs [001 003 ...]        (default: all posts)
// Exits 1 if anything needs fixing, so it can gate a render.
import { CARDS, config, fill, hasAudio, pickPosts, problems, xLength } from './lib.mjs';

const [posts] = pickPosts(process.argv.slice(2));
let bad = 0;

console.log(`\ntime: ${config.time}   BBC: ${config.bbcLink}\n`);
for (const post of posts) {
	const x = fill(post.caption?.x, post);
	console.log(`━━ ${post.id}  [${CARDS[post.card] ?? post.card}] ${'━'.repeat(40)}`);
	console.log(`Playlist:   ${post.playlistName || '(name missing)'}  ${post.playlistUrl || '(link missing)'}`);
	console.log(`Dedication: ${post.dedicationUrl || '(missing)'}`);
	if ((post.platforms ?? ['x', 'instagram']).includes('x')) console.log(`\nX (${xLength(x)}/280):\n  ${x}`);
	console.log(`\nInstagram:\n  ${fill(post.caption?.instagram, post)}${post.hashtags?.length ? `\n  ${post.hashtags.join(' ')} (${post.hashtags.length}/5)` : ''}`);
	if (post.image) console.log(`\nImage: ${post.image}`);
	if (post.notes?.length) console.log(`\nNotes:\n${post.notes.map((n) => `  - ${n}`).join('\n')}`);
	if (post.card === 'image') console.log('\n(ready-made image: no video line)');
	else console.log(`\nPete says in the video (${post.videoLine?.length ?? 0}/200)${hasAudio(post.id) ? '' : ' [audio not rendered]'}:\n  ${post.videoLine}`);
	console.log(`\nPete says in the Dedication (${post.dedicationIntro?.length ?? 0}/200), type this into the site:\n  ${post.dedicationIntro || '(missing)'}`);
	const p = problems(post);
	bad += p.length;
	console.log(p.length ? `\n⚠ To fix:\n${p.map((s) => `  - ${s}`).join('\n')}\n` : '\n✓ Ready\n');
}
process.exit(bad ? 1 : 0);
