// Build a review page for some posts: the image or video, caption and hashtags as they would be posted,
// the playlist and Dedication links, and the Dedication intro with its audio (if rendered):
//   node preview.mjs [008 009 ...]      (default: all posts)    ->  preview/index.html
// Open it through any local web server rooted at the repo, e.g. http://localhost:8080/social/preview/index.html
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CARDS, audioPath, config, fill, here, pickPosts, problems, xLength } from './lib.mjs';

const [posts] = pickPosts(process.argv.slice(2));
const outDir = path.join(here, 'preview');
mkdirSync(outDir, { recursive: true });
const rel = (file) => path.relative(outDir, file).split(path.sep).join('/');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const card = (post) => {
	const dedAudio = audioPath(`${post.id}-dedication`);
	const videoAudio = audioPath(post.id);
	const square = path.join(here, 'exports', `${post.id}-square.mp4`);
	const story = path.join(here, 'exports', `${post.id}-story.mp4`);
	const media =
		post.card === 'image'
			? `<img src="${esc(rel(path.resolve(post.dir, post.image)))}" alt="">`
			: [square, story].filter(existsSync).map((v) => `<video src="${esc(rel(v))}" controls loop muted playsinline></video>`).join('') ||
				'<p class="missing">Video not rendered: npm run export</p>';
	const ig = fill(post.caption?.instagram, post);
	const x = fill(post.caption?.x, post);
	const issues = problems(post);
	const platforms = post.platforms ?? ['x', 'instagram'];
	return `<article>
	<h2>${esc(post.id)} <span>${esc(CARDS[post.card])}</span></h2>
	<div class="media">${media}</div>
	<div class="text">
		${platforms.includes('instagram') ? `<h3>Instagram</h3><p>${esc(ig)}</p><p class="tags">${esc((post.hashtags ?? []).join(' '))}</p>` : ''}
		${platforms.includes('x') ? `<h3>X <small>${xLength(x)}/280</small></h3><p>${esc(x)}</p>` : ''}
		${post.videoLine ? `<h3>Pete in the video</h3><p>${esc(post.videoLine)}</p>${existsSync(videoAudio) ? `<audio controls src="${esc(rel(videoAudio))}"></audio>` : ''}` : ''}
		<h3>Pete in the Dedication</h3>
		<p>${esc(post.dedicationIntro) || '<span class="missing">(not written)</span>'}</p>
		${existsSync(dedAudio) ? `<audio controls src="${esc(rel(dedAudio))}"></audio>` : '<p class="missing">Audio not rendered: npm run dedicate</p>'}
		<p class="links">Playlist: <b>${esc(post.playlistName) || '(none)'}</b> ${post.playlistUrl ? `<a href="${esc(post.playlistUrl)}">open</a>` : ''}<br>
		Dedication: ${post.dedicationUrl ? `<a href="${esc(post.dedicationUrl)}">${esc(post.dedicationUrl)}</a>` : '<span class="missing">not created yet</span>'}</p>
		${post.notes?.length ? `<h3>Check before posting</h3><ul>${post.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
		${issues.length ? `<p class="todo">To fix: ${esc(issues.join(' · '))}</p>` : '<p class="ok">Ready</p>'}
	</div>
</article>`;
};

writeFileSync(
	path.join(outDir, 'index.html'),
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Social posts: review</title>
<style>
:root{color-scheme:dark light;--bg:#0d0d0d;--panel:#1a1a1a;--edge:#333;--fg:#fff;--dim:#999;--accent:#ff6b35;--bad:#ff6b6b;--good:#6bd36b}
@media (prefers-color-scheme:light){:root{--bg:#f4f4f4;--panel:#fff;--edge:#ddd;--fg:#111;--dim:#666;--bad:#c0392b;--good:#1e8e3e}}
*{box-sizing:border-box}body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
h1{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:var(--dim);text-align:center;margin:0 0 4px}
.sub{text-align:center;color:var(--dim);font-size:13px;margin-bottom:24px}
main{max-width:1000px;margin:0 auto;display:grid;gap:20px}
article{background:var(--panel);border:1px solid var(--edge);border-radius:16px;padding:16px;display:grid;gap:16px;grid-template-columns:minmax(0,1fr)}
@media(min-width:760px){article{grid-template-columns:360px minmax(0,1fr)}article h2{grid-column:1/-1}}
h2{margin:0;font-size:16px;color:var(--accent)}h2 span{color:var(--dim);font-weight:400;font-size:13px;margin-left:8px}
.media img,.media video{width:100%;border-radius:10px;display:block;margin-bottom:8px}
h3{margin:14px 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--dim)}h3:first-child{margin-top:0}h3 small{letter-spacing:0}
p{margin:0 0 6px}.tags{color:var(--accent)}audio{width:100%;margin:4px 0}.links{margin-top:14px;font-size:13px}a{color:var(--accent)}
.missing{color:var(--dim);font-style:italic}.todo{color:var(--bad);font-size:13px;margin-top:12px}.ok{color:var(--good);margin-top:12px}ul{margin:0;padding-left:18px}
</style></head><body>
<h1>Social posts: review</h1>
<p class="sub">Show time: ${esc(config.time)} · BBC: ${esc(config.bbcLink)} · ${posts.length} post${posts.length === 1 ? '' : 's'}</p>
<main>${posts.map(card).join('\n')}</main></body></html>
`
);
console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, 'index.html'))} (${posts.length} posts)`);
