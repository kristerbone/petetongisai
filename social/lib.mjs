// Shared helpers: find posts under posts/, fill in {placeholders}, check limits.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const postsDir = path.join(here, 'posts');
// up/on/off/playlist are the animated cards export.mjs renders; image is a ready-made picture (post.image, relative to the post file)
export const CARDS = { up: 'Coming up', on: 'On air', off: 'Off air', playlist: 'Playlist', image: 'Image' };
export const PLATFORMS = ['x', 'instagram'];
export const LIMITS = { x: 280, intro: 200 };

/** The hosting Spotify account's public playlists, keyed by short slug (playlists.json). */
export const playlists = JSON.parse(readFileSync(path.join(here, 'playlists.json'), 'utf8')).playlists;

/** Settings shared by every post: show time, BBC link (config.json). */
export const config = JSON.parse(readFileSync(path.join(here, 'config.json'), 'utf8'));

/** Every post file has exactly these fields, in this order (`npm run format` enforces it); new posts start from these values. */
export const POST_DEFAULTS = {
	card: 'up',
	platforms: ['x', 'instagram'],
	screen: {},
	image: '',
	videoLine: '',
	dedicationIntro: '',
	playlist: '',
	playlistName: '',
	playlistUrl: '',
	dedicationUrl: '',
	caption: { x: '', instagram: '' },
	hashtags: [],
	notes: []
};

const POST_FILE = /^(\d{3})-.+\.json$/;

/** Every post (posts/NNN-name.json), in number order. A post's "playlist" key fills in its playlistName and playlistUrl unless they are set. */
export function loadPosts() {
	return readdirSync(postsDir)
		.filter((f) => POST_FILE.test(f))
		.sort()
		.map((f) => {
			const post = { id: f.replace(/\.json$/, ''), dir: postsDir, ...JSON.parse(readFileSync(path.join(postsDir, f), 'utf8')) };
			if (post.playlist) {
				const pl = playlists[post.playlist];
				if (!pl) throw new Error(`${post.id}: no playlist "${post.playlist}" in playlists.json (have: ${Object.keys(playlists).join(', ')})`);
				post.playlistName ||= pl.title;
				post.playlistUrl ||= pl.url;
			}
			return post;
		});
}

/** Pick posts by number ("002") or full id ("002-on-air"); no numbers means all. Returns [posts, restOfArgs, explicit]. */
export function pickPosts(args) {
	const all = loadPosts();
	const wanted = args.filter((a) => /^\d{3}(-.+)?$/.test(a));
	const rest = args.filter((a) => !wanted.includes(a));
	for (const w of wanted) if (!all.some((p) => p.id === w || p.id.startsWith(`${w}-`))) throw new Error(`No post "${w}"`);
	const posts = wanted.length ? all.filter((p) => wanted.some((w) => p.id === w || p.id.startsWith(`${w}-`))) : all;
	return [posts, rest, wanted.length > 0];
}

/** Replace {dedication}, {playlist}, {playlistName}, {time}, {bbc} in a caption or on-screen text. Unset values stay visible as {name}. */
export function fill(text, post) {
	const vars = {
		dedication: post.dedicationUrl,
		playlist: post.playlistUrl,
		playlistName: post.playlistName,
		time: config.time,
		bbc: config.bbcLink
	};
	return (text ?? '').replace(/\{(\w+)\}/g, (m, k) => vars[k] || m);
}

/** X counts every link as 23 characters. */
export const xLength = (text) => [...text.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;

/** Things to fix before this post goes out. */
export function problems(post) {
	const out = [];
	if (!CARDS[post.card]) out.push(`card must be one of ${Object.keys(CARDS).join(', ')}`);
	// "platforms" (default both) says which captions this post needs
	for (const k of post.platforms ?? PLATFORMS) if (!post.caption?.[k]) out.push(`caption.${k} is empty`);
	if (post.caption?.x && xLength(fill(post.caption.x, post)) > LIMITS.x) out.push(`caption.x is over ${LIMITS.x} characters`);
	if (post.card === 'image' && !existsSync(path.resolve(post.dir, post.image ?? ''))) out.push('image file not found');
	for (const k of post.card === 'image' ? ['dedicationIntro'] : ['videoLine', 'dedicationIntro']) {
		if (!post[k]) out.push(`${k} is empty`);
		else if (post[k].length > LIMITS.intro) out.push(`${k} is over ${LIMITS.intro} characters (the site's Intro limit)`);
	}
	if ((post.hashtags?.length ?? 0) > 5) out.push('more than 5 hashtags (Instagram allows 5)');
	if (!post.playlistName) out.push('playlistName is empty');
	if (!post.playlistUrl) out.push('playlistUrl is empty');
	if (!post.dedicationUrl) out.push('dedicationUrl is empty');
	if (/\{\w+\}/.test(fill(post.caption?.x, post) + fill(post.caption?.instagram, post)))
		out.push('a caption still has an unfilled {placeholder}');
	return out;
}

export const audioPath = (postId) => path.join(here, 'audio', `${postId}.wav`);
export const hasAudio = (postId) => existsSync(audioPath(postId));
