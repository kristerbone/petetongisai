// Shared helpers: find shows and posts under posts/, fill in {placeholders}, check limits.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const postsDir = path.join(here, 'posts');
export const CARDS = { up: 'Coming up', on: 'On air', off: 'Off air' };
export const LIMITS = { x: 280, intro: 200 };

export const listShows = () =>
	readdirSync(postsDir, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

/** The show named by `arg` if it is one, else the newest. Returns [showId, restOfArgs]. */
export function pickShow(args) {
	const shows = listShows();
	const named = args.find((a) => shows.includes(a));
	return [named ?? shows.at(-1), args.filter((a) => a !== named)];
}

/** The hosting Spotify account's public playlists, keyed by short slug (playlists.json). */
export const playlists = JSON.parse(readFileSync(path.join(here, 'playlists.json'), 'utf8')).playlists;

/** A show's settings and its posts (posts/<show>/NN-name.json), in order. A post's "playlist" key fills in its playlistName and playlistUrl unless they are set. */
export function loadShow(showId) {
	const dir = path.join(postsDir, showId);
	const show = JSON.parse(readFileSync(path.join(dir, 'show.json'), 'utf8'));
	const posts = readdirSync(dir)
		.filter((f) => /^\d\d-.+\.json$/.test(f))
		.sort()
		.map((f) => {
			const post = { id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(path.join(dir, f), 'utf8')) };
			if (post.playlist) {
				const pl = playlists[post.playlist];
				if (!pl) throw new Error(`${showId}/${post.id}: no playlist "${post.playlist}" in playlists.json (have: ${Object.keys(playlists).join(', ')})`);
				post.playlistName ||= pl.title;
				post.playlistUrl ||= pl.url;
			}
			return post;
		});
	return { id: showId, dir, show, posts };
}

/** Replace {dedication}, {playlist}, {playlistName}, {time}, {bbc} in a caption or on-screen text. Unset values stay visible as {name}. */
export function fill(text, post, show) {
	const vars = {
		dedication: post.dedicationUrl,
		playlist: post.playlistUrl,
		playlistName: post.playlistName,
		time: show.time,
		bbc: show.bbcLink
	};
	return (text ?? '').replace(/\{(\w+)\}/g, (m, k) => vars[k] || m);
}

/** X counts every link as 23 characters. */
export const xLength = (text) => [...text.replace(/https?:\/\/\S+/g, 'x'.repeat(23))].length;

/** Things to fix before this post goes out. */
export function problems(post, show) {
	const out = [];
	if (!CARDS[post.card]) out.push(`card must be one of ${Object.keys(CARDS).join(', ')}`);
	for (const k of ['x', 'instagram']) if (!post.caption?.[k]) out.push(`caption.${k} is empty`);
	if (post.caption?.x && xLength(fill(post.caption.x, post, show)) > LIMITS.x) out.push(`caption.x is over ${LIMITS.x} characters`);
	for (const k of ['videoLine', 'dedicationIntro']) {
		if (!post[k]) out.push(`${k} is empty`);
		else if (post[k].length > LIMITS.intro) out.push(`${k} is over ${LIMITS.intro} characters (the site's Intro limit)`);
	}
	if (!post.playlistName) out.push('playlistName is empty');
	if (!post.playlistUrl) out.push('playlistUrl is empty');
	if (!post.dedicationUrl) out.push('dedicationUrl is empty');
	if (/\{\w+\}/.test(fill(post.caption?.x, post, show) + fill(post.caption?.instagram, post, show)))
		out.push('a caption still has an unfilled {placeholder}');
	return out;
}

export const audioPath = (showId, postId) => path.join(here, 'audio', showId, `${postId}.wav`);
export const hasAudio = (showId, postId) => existsSync(audioPath(showId, postId));
