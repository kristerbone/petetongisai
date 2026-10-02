import type { Form } from './lines';

export type Piece = { trackId: string; form: Form };
/** A Track ID: the newest track, then (usually) the one before it. */
export type Announcement = { lead: Piece; follow: Piece | null; atEnd: boolean };

/**
 * When Pete back-announces, and how each track gets named (ticket 13). Every second track start
 * announces the two tracks before it, newest first; whatever is left gets announced when the
 * music ends. Each track's line is fetched as soon as it starts, so it's ready in time.
 */
export class TrackIdSession {
	private played: Piece[] = [];
	private announced = 0;

	/** singleTrack: a track link, not a playlist, so its one Track ID names it as the newest. */
	constructor(private singleTrack: boolean) {}

	/** A track started. Returns the line to start preparing, and a Track ID to play now, if due. */
	trackStarted(trackId: string): { prepare: Piece; announce: Announcement | null } | null {
		// Resuming or replaying the same track isn't a new start
		if (this.played.at(-1)?.trackId === trackId) return null;
		const n = this.played.length + 1;
		const form: Form = this.singleTrack || n % 2 === 0 ? 'lead' : n === 1 ? 'first' : 'follow';
		const prepare = { trackId, form };
		this.played.push(prepare);
		if (n < 3 || n % 2 === 0) return { prepare, announce: null };
		this.announced = n - 1;
		return { prepare, announce: { lead: this.played[n - 2], follow: this.played[n - 3], atEnd: false } };
	}

	/** The music ended: announce any tracks not yet named. A lone leftover is named as the newest. */
	ended(): Announcement | null {
		const left = this.played.slice(this.announced);
		this.announced = this.played.length;
		if (left.length === 0) return null;
		if (left.length === 1) return { lead: { trackId: left[0].trackId, form: 'lead' }, follow: null, atEnd: true };
		return { lead: left[1], follow: left[0], atEnd: true };
	}
}
