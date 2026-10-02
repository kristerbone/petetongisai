import type { SpotifyEmbed } from '$lib/spotify/embed';
import { pete } from '$lib/desk/pete-audio';
import { PIECES, type Form } from './lines';
import { TrackIdSession, type Announcement, type Piece } from './session';

const POLL_MS = 2000;
const GIVE_UP_MS = 180_000; // a cold GPU takes about a minute; past this, a generic line
const WAIT_AT_TRACK_START_MS = 8000; // the music is paused while Pete waits for a line
const GAP_S = 0.15; // between pieces
const TARGET_RMS = 0.1; // the rendered lines come out quieter or louder than the pre-rendered pieces
const CLOSER_ODDS = 1 / 3;

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Track IDs (ticket 13): follows the embed's track starts, fetches each track's line while it
 * plays, and when one is due pauses the music, plays Pete's back-announcement and resumes.
 * Pieces are joined in Web Audio, so they play back to back without gaps or a fresh tap.
 */
export class TrackIds {
	private session = new TrackIdSession(false);
	private lines = new Map<string, Promise<AudioBuffer | null>>();
	private ctx: AudioContext | null = null;
	private queue: Promise<void> = Promise.resolve();
	private generation = 0;

	constructor(private embed: SpotifyEmbed) {}

	/** Call inside the Play tap: the browser only lets audio start from one. */
	unlock() {
		this.ctx ??= new AudioContext();
		this.ctx.resume().catch(() => {});
	}

	/** New music loaded: a fresh session, so Pete doesn't back-announce the last one. */
	start(uri: string) {
		this.generation++;
		this.session = new TrackIdSession(uri.startsWith('spotify:track:'));
	}

	trackStarted(uri: string) {
		const trackId = uri.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1];
		if (!trackId) return;
		const step = this.session.trackStarted(trackId);
		if (!step) return;
		this.line(step.prepare);
		if (step.announce) this.announce(step.announce);
	}

	ended() {
		const announcement = this.session.ended();
		if (announcement) this.announce(announcement);
	}

	private announce(a: Announcement) {
		const generation = this.generation;
		this.queue = this.queue.then(async () => {
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

	/** opener + newest track + joiner + older track (+ a closer, one time in three, mid-session) */
	private async assemble(a: Announcement): Promise<AudioBuffer[]> {
		const wait = a.atEnd ? GIVE_UP_MS : WAIT_AT_TRACK_START_MS;
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
			piece = fetch(`/track-ids/${id}.mp3`)
				.then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${id}: ${r.status}`))))
				.then((data) => this.decode(data))
				.catch((e) => {
					console.warn('Track ID piece failed', e);
					return null;
				});
			this.pieces.set(id, piece);
		}
		return piece;
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
