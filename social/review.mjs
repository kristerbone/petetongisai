// Print one show's posts for review, with placeholders filled in and a list of what is still missing:
//   node review.mjs [show]        (default: the newest show)
// Exits 1 if anything needs fixing, so it can gate a render.
import { CARDS, fill, hasAudio, loadShow, pickShow, problems, xLength } from './lib.mjs';

const [showId] = pickShow(process.argv.slice(2));
const { show, posts } = loadShow(showId);
let bad = 0;

console.log(`\nShow ${showId}   time: ${show.time}   BBC: ${show.bbcLink}\n`);
for (const post of posts) {
	const x = fill(post.caption?.x, post, show);
	console.log(`━━ ${post.id}  [${CARDS[post.card] ?? post.card}] ${'━'.repeat(40)}`);
	console.log(`Playlist:   ${post.playlistName || '(name missing)'}  ${post.playlistUrl || '(link missing)'}`);
	console.log(`Dedication: ${post.dedicationUrl || '(missing)'}`);
	console.log(`\nX (${xLength(x)}/280):\n  ${x}`);
	console.log(`\nInstagram:\n  ${fill(post.caption?.instagram, post, show)}`);
	console.log(`\nPete says in the video (${post.videoLine?.length ?? 0}/200)${hasAudio(showId, post.id) ? '' : ' [audio not rendered]'}:\n  ${post.videoLine}`);
	console.log(`\nPete says in the Dedication (${post.dedicationIntro?.length ?? 0}/200), type this into the site:\n  ${post.dedicationIntro || '(missing)'}`);	const p = problems(post, show);
	bad += p.length;
	console.log(p.length ? `\n⚠ To fix:\n${p.map((s) => `  - ${s}`).join('\n')}\n` : '\n✓ Ready\n');
}
process.exit(bad ? 1 : 0);
