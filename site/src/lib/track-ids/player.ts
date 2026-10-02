import type { SpotifyEmbed } from '$lib/spotify/embed';
import { pete } from '$lib/desk/pete-audio.svelte';
import { PIECES, type Form } from './lines';
import { matchTrack, type ListedTrack } from './match';
import { TrackIdSession, type Announcement, type Piece } from './session';

const POLL_MS = 2000;
const GIVE_UP_MS = 180_000; // a cold GPU takes about a minute; past this, a generic line
// A line not ready at the track change: the music plays on, and Pete comes in once it's ready,
// up to this far into the track; after that, a generic line
const LATE_LIMIT_MS = 30_000;
const GAP_S = 0.15; // between pieces
const TARGET_RMS = 0.1; // the rendered lines come out quieter or louder than the pre-rendered pieces
const CLOSER_ODDS = 1 / 3;

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Track IDs (ticket 13): follows the embed's track starts, fetches each track's line while it
 * plays (and, in a playlist, the next track's too), and when one is due pauses the music, plays
 * Pete's back-announcement and resumes.
 * Pieces are joined in Web Audio, so they play back to back without gaps or a fresh tap.
 */
export class TrackIds {
	private session = new TrackIdSession(false);
	private lines = new Map<string, Promise<AudioBuffer | null>>();
	private ctx: AudioContext | null = null;
	private queue: Promise<void> = Promise.resolve();
	private generation = 0;
	// Track starts are resolved in order: a playlist's track list may still be loading
	private starts: Promise<void> = Promise.resolve();
	private playlist: Promise<ListedTrack[] | null> = Promise.resolve(null);
	private lastMatch = -1;
	private matched = new Set<number>();
	private unmatched = 0;
	// Settles when the next track starts, so a late Track ID stops waiting on a skip
	private nextStart!: Promise<void>;
	private onNextStart = () => {};

	constructor(private embed: SpotifyEmbed) {
		this.armNextStart();
	}

	private armNextStart() {
		this.onNextStart();
		this.nextStart = new Promise((resolve) => (this.onNextStart = resolve));
	}

	/** Call inside the Play tap: the browser only lets audio start from one. */
	unlock() {
		this.ctx ??= new AudioContext();
		this.ctx.resume().catch(() => {});
	}

	/** New music loaded: a fresh session, so Pete doesn't back-announce the last one. */
	start(uri: string) {
		this.generation++;
		this.session = new TrackIdSession(uri.startsWith('spotify:track:'));
		this.lastMatch = -1;
		this.matched = new Set();
		const playlistId = uri.match(/^spotify:playlist:([A-Za-z0-9]{22})$/)?.[1];
		this.playlist = playlistId
			? fetch(`/api/playlist/${playlistId}`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null)
			: Promise.resolve(null);
	}

	/** uri is the track's, or (signed in) the playlist's, with the track's duration to find it by. */
	trackStarted(uri: string, durationMs: number) {
		const generation = this.generation;
		this.starts = this.starts.then(async () => {
			const trackId = await this.identify(uri, durationMs);
			if (generation !== this.generation) return;
			const step = this.session.trackStarted(trackId);
			if (!step) return;
			this.armNextStart();
			this.line(step.prepare);
			await this.renderAhead();
			if (step.announce) this.announce(step.announce);
		});
	}

	/**
	 * Start the next track's line now, guessing it's the next in the playlist, so it's ready by the
	 * time it's due. A skip or shuffle wastes the render, but the line stays cached for everyone.
	 */
	private async renderAhead() {
		const list = await this.playlist;
		const next = this.lastMatch + 1;
		if (!list || next >= list.length || this.matched.has(next)) return;
		this.line({ trackId: list[next].trackId, form: this.session.nextForm() });
	}

	/** The track's id, or a placeholder (named with a generic line) when it can't be told. */
	private async identify(uri: string, durationMs: number): Promise<string> {
		const direct = uri.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1];
		const list = await this.playlist;
		if (direct) {
			// Signed out: the embed names the track; find it in the playlist anyway, for rendering ahead
			const i = list?.findIndex((t) => t.trackId === direct) ?? -1;
			if (i >= 0) {
				this.lastMatch = i;
				this.matched.add(i);
			}
			return direct;
		}
		const i = list ? matchTrack(list, durationMs, this.lastMatch, this.matched) : null;
		if (i === null) return `unknown-${++this.unmatched}`;
		this.lastMatch = i;
		this.matched.add(i);
		return list![i].trackId;
	}

	/** The music ended: names whatever's left. Resolves once Pete has finished speaking. */
	ended(): Promise<void> {
		return this.starts.then(() => {
			const announcement = this.session.ended();
			if (announcement) this.announce(announcement);
			return this.queue;
		});
	}

	/** Play one of Pete's pre-rendered lines (a Sign-off), after any Track ID still playing. */
	say(url: string): Promise<void> {
		this.queue = this.queue.then(async () => {
			pete.speaking = true;
			try {
				const line = await this.fetchAudio(url);
				if (line) await this.play([line]);
			} finally {
				pete.speaking = false;
			}
		});
		return this.queue;
	}

	private announce(a: Announcement) {
		const generation = this.generation;
		const skipped = this.nextStart; // the start after this one, not whichever is latest by then
		this.queue = this.queue.then(async () => {
			if (generation !== this.generation) return;
			// Mid-session the music plays on while Pete's lines finish: late, but named
			if (!a.atEnd) await this.ready(a, skipped);
			if (generation !== this.generation) return;
			const pause = !a.atEnd;
			if (pause) this.embed.pause({ hold: true });
			pete.speaking = true;
			try {
				await this.play(await this.assemble(a));
			} catch (e) {
				console.warn('Track ID failed', e);
			} finally {
				pete.speaking = false;
				if (pause) this.embed.resume();
			}
		});
	}

	/** Until the Track ID's lines are ready, LATE_LIMIT_MS passes, or the listener skips to another track. */
	private ready(a: Announcement, skipped: Promise<void>): Promise<unknown> {
		const lines = Promise.all([this.line(a.lead), a.follow && this.line(a.follow)]);
		return Promise.race([lines, new Promise((r) => setTimeout(r, LATE_LIMIT_MS)), skipped]);
	}

	/** opener + newest track + joiner + older track (+ a closer, one time in three, mid-session) */
	private async assemble(a: Announcement): Promise<AudioBuffer[]> {
		// Mid-session ready() has already waited: whatever isn't ready now gets a generic line
		const wait = a.atEnd ? GIVE_UP_MS : 0;
		const [lead, follow] = await Promise.all([this.lineOrGeneric(a.lead, wait), a.follow && this.lineOrGeneric(a.follow, wait)]);
		const parts = [this.piece(pick(PIECES.openers).id), lead];
		if (follow) parts.push(this.piece(pick(PIECES.joiners).id), follow);
		if (!a.atEnd && Math.random() < CLOSER_ODDS) parts.push(this.piece(pick(PIECES.closers).id));
		return (await Promise.all(parts)).filter((b): b is AudioBuffer => !!b);
	}

	/** The track's own line if it's ready within `wait`, otherwise a pre-rendered generic one. */
	private async lineOrGeneric(p: Piece, wait: number): Promise<AudioBuffer | null> {
		const timeout = new Promise<null>((r) => setTimeout(() => r(null), wait));
		const line = await Promise.race([this.line(p), timeout]);
		if (line) return line;
		return this.piece(pick(p.form === 'lead' ? PIECES.genericLeads : PIECES.genericFollows).id);
	}

	/** Fetch (and keep polling for) a track's line; null means use a generic one. */
	private line({ trackId, form }: Piece): Promise<AudioBuffer | null> {
		if (!/^[A-Za-z0-9]{22}$/.test(trackId)) return Promise.resolve(null);
		const key = `${trackId}/${form}`;
		let line = this.lines.get(key);
		if (!line) {
			line = this.poll(trackId, form).catch((e) => {
				console.warn('Track ID line failed', key, e);
				return null;
			});
			this.lines.set(key, line);
		}
		return line;
	}

	private async poll(trackId: string, form: Form): Promise<AudioBuffer | null> {
		const began = Date.now();
		while (Date.now() - began < GIVE_UP_MS) {
			const res = await fetch(`/api/track-id/${trackId}/${form}`);
			if (res.status === 200) return this.decode(await res.arrayBuffer());
			if (res.status !== 202) return null;
			await new Promise((r) => setTimeout(r, POLL_MS));
		}
		return null;
	}

	private pieces = new Map<string, Promise<AudioBuffer | null>>();
	private piece(id: string): Promise<AudioBuffer | null> {
		let piece = this.pieces.get(id);
		if (!piece) {
			piece = this.fetchAudio(`/track-ids/${id}.mp3`);
			this.pieces.set(id, piece);
		}
		return piece;
	}

	private fetchAudio(url: string): Promise<AudioBuffer | null> {
		return fetch(url)
			.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${url}: ${r.status}`))))
			.then((data) => this.decode(data))
			.catch((e) => {
				console.warn('Pete’s line failed to load', e);
				return null;
			});
	}

	private decode(data: ArrayBuffer) {
		this.ctx ??= new AudioContext();
		return this.ctx.decodeAudioData(data);
	}

	private play(buffers: AudioBuffer[]): Promise<void> {
		const ctx = this.ctx;
		if (!ctx || buffers.length === 0) return Promise.resolve();
		let at = ctx.currentTime + 0.05;
		let last: AudioBufferSourceNode | null = null;
		for (const buffer of buffers) {
			const source = ctx.createBufferSource();
			source.buffer = buffer;
			const gain = ctx.createGain();
			gain.gain.value = Math.min(4, TARGET_RMS / rms(buffer));
			source.connect(gain).connect(ctx.destination);
			source.start(at);
			at += buffer.duration + GAP_S;
			last = source;
		}
		return new Promise((resolve) => (last!.onended = () => resolve()));
	}
}

/** Loudness of the speech, leaving out the silences around and between words. */
function rms(buffer: AudioBuffer) {
	const data = buffer.getChannelData(0);
	let sum = 0;
	let n = 0;
	for (let i = 0; i < data.length; i++) {
		if (Math.abs(data[i]) < 0.01) continue;
		sum += data[i] * data[i];
		n++;
	}
	return n ? Math.sqrt(sum / n) : TARGET_RMS;
}
