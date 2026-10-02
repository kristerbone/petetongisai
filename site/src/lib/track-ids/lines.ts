import LINES from './lines.json';

/**
 * How a track is named in a Track ID (.scratch/site-v2/petes-lines.md §3): "lead" as the newest
 * track, "follow" after a joiner as the older one, "first" as the older one when it opened the session.
 */
export type Form = 'lead' | 'follow' | 'first';
export const FORMS: readonly Form[] = ['lead', 'follow', 'first'];

export type TrackName = { title: string; artist: string };

const TEMPLATES: Record<Form, string[]> = { lead: LINES.leads, follow: LINES.follows, first: LINES.firsts };

/** Same track and form, same template: each track's line is rendered once and shared by everyone. */
export function trackLine(trackId: string, form: Form, name: TrackName): string {
	const templates = TEMPLATES[form];
	const template = templates[hash(`${trackId}:${form}`) % templates.length];
	return template.replace('{title}', name.title).replace('{artist}', name.artist);
}

function hash(s: string) {
	let h = 0;
	for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
	return h;
}

/** Pre-rendered pieces (scripts/render-lines.mjs), served from /track-ids/<id>.mp3. */
export const PIECES = LINES;
