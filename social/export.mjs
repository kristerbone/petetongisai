// Render each post's card to MP4 (square and story), with Pete's voice if audio/<post>.wav exists:
//   node export.mjs [--seconds N] [001 002 ...]     (default: every animated post)
// Needs: npm install, npx playwright install chromium, and ffmpeg on the PATH.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { audioPath, fill, hasAudio, here, pickPosts } from './lib.mjs';

const argv = process.argv.slice(2);
const si = argv.indexOf('--seconds');
const seconds = si >= 0 ? Number(argv[si + 1]) : 12; // 12s = one full ticker loop
const [posts] = pickPosts(argv.filter((a, i) => i !== si && i !== si + 1));
const out = path.join(here, 'exports');
const formats = {
	square: { w: 1080, h: 1080 }, // X, Instagram feed
	story: { w: 1080, h: 1920 } // Reels, Stories
};

// Tiny static server so the card page loads over http.
const server = createServer(async (req, res) => {
	try {
		const file = path.join(here, path.basename(new URL(req.url, 'http://x').pathname) || 'status-animations.html');
		res.setHeader('content-type', 'text/html');
		res.end(await readFile(file));
	} catch {
		res.statusCode = 404;
		res.end();
	}
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/status-animations.html`;

await mkdir(out, { recursive: true });
const tmp = path.join(out, '.tmp');
const browser = await chromium.launch();

for (const post of posts) {
	if (post.card === 'image') continue; // a ready-made picture: nothing to render
	// With Pete's voice, it starts 1s in and the clip runs until ~2.5s after he finishes, or `seconds` if longer.
	const voice = audioPath(post.id);
	const withVoice = hasAudio(post.id);
	const voiceLen = withVoice
		? Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', voice]).toString())
		: 0;
	const length = withVoice ? Math.max(seconds, Math.ceil(voiceLen + 3.5)) : seconds;
	// On-screen text can use the same {placeholders} as captions, e.g. "sub": "{playlistName}"
	const screen = Object.fromEntries(Object.entries(post.screen ?? {}).map(([k, v]) => [k, fill(v, post)]));
	const params = new URLSearchParams({ card: post.card, ...screen });

	for (const [fmt, size] of Object.entries(formats)) {
		await rm(tmp, { recursive: true, force: true });
		const ctx = await browser.newContext({
			viewport: { width: size.w, height: size.h },
			recordVideo: { dir: tmp, size: { width: size.w, height: size.h } }
		});
		const page = await ctx.newPage();
		await page.goto(`${base}?${params}`);
		await page.waitForTimeout(length * 1000 + 600);
		const video = page.video();
		await ctx.close(); // flushes the recording
		const webm = await video.path();
		const mp4 = path.join(out, `${post.id}-${fmt}.mp4`);
		// Drop the first 0.6s (page load); H.264 + yuv420p so X and Instagram accept it.
		const audioArgs = withVoice
			? ['-i', voice, '-filter_complex', '[1:a]adelay=1000|1000,apad[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k']
			: ['-an'];
		execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.6', '-i', webm, ...audioArgs, '-t', String(length), '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4]);
		console.log('wrote', path.relative(process.cwd(), mp4), withVoice ? `(${length}s, with voice)` : `(${length}s, silent)`);
	}
}

await rm(tmp, { recursive: true, force: true });
await browser.close();
server.close();
