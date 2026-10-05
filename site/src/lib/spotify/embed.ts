/**
 * Spotify's iFrame API (ADR 0001): the embed plays the music; the page can load, play and pause
 * it and hear about playback, but never touches the audio itself.
 * https://developer.spotify.com/documentation/embeds/references/iframe-api
 */
type PlaybackUpdate = { playingURI: string; isPaused: boolean; isBuffering: boolean; duration: number; position: number };
type EmbedController = {
	loadUri(uri: string): void;
	play(): void;
	pause(): void;
	resume(): void;
	addListener(event: 'ready', cb: () => void): void;
	addListener(event: 'playback_started' | 'playback_update', cb: (e: { data: PlaybackUpdate }) => void): void;
};
type IFrameAPI = {
	createController(el: HTMLElement, options: { uri: string; width?: string | number; height?: number }, cb: (c: EmbedController) => void): void;
};

declare global {
	interface Window {
		onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
	}
}

let apiPromise: Promise<IFrameAPI> | null = null;
function loadApi(): Promise<IFrameAPI> {
	apiPromise ??= new Promise((resolve) => {
		window.onSpotifyIframeApiReady = resolve;
		const script = document.createElement('script');
		script.src = 'https://open.spotify.com/embed/iframe-api/v1';
		script.async = true;
		document.body.appendChild(script);
	});
	return apiPromise;
}

export type EmbedEvents = {
	/** The embed started or stopped playing (the Tunes lamp reflects this). */
	onPlayingChange?: (playing: boolean) => void;
	/**
	 * A track began playing (not a resume); Track IDs (ticket 13) build on this. Signed-out
	 * listeners' embeds report the track's URI; signed-in listeners' report only the playlist's,
	 * so the track's duration comes too, to tell which one it is.
	 */
	onTrackStart?: (uri: string, durationMs: number) => void;
	/** The listener pressed play on the embed itself while holdForTap() was waiting; the music is held paused. */
	onTapped?: () => void;
	/** The last track finished and nothing else is coming. */
	onEnded?: () => void;
};

// A signed-in listener's embed reports the playlist, not the track: a new track shows up only as
// a new duration. Within one track the duration wobbles by tens of milliseconds.
const NEW_TRACK_DURATION_MS = 1500;
// The embed sends no event when the music runs out: updates just stop at the end of the track
const NEAR_END_MS = 1500;
const ENDED_AFTER_MS = 2500;

export class SpotifyEmbed {
	private controller: EmbedController | null = null;
	private ready: Promise<void> | null = null;
	// The embed ignores pause() while it's still starting a track, so a wanted pause is re-sent
	// on every update that says it's playing, until resume()
	private holdPaused = false;
	// holdForTap(): waiting for the listener to press play on the embed; playing changes aren't reported
	// until resume() or play(), so the first blip of music doesn't light the Tunes lamp
	private tapArmed = false;
	private quiet = false;
	private endTimer: ReturnType<typeof setTimeout> | undefined;
	private current: { uri: string; duration: number } | null = null;
	playing = false;

	constructor(
		private el: HTMLElement,
		private events: EmbedEvents = {}
	) {}

	/** Load a track or playlist URI into the embed (creating it the first time). */
	async load(uri: string) {
		this.current = null;
		if (this.controller) {
			this.ready = new Promise((resolve) => this.controller!.addListener('ready', resolve));
			this.controller.loadUri(uri);
			return this.ready;
		}
		const api = await loadApi();
		this.ready = new Promise((resolve) => {
			api.createController(this.el, { uri, width: '100%', height: 152 }, (c) => {
				this.controller = c;
				c.addListener('ready', () => resolve());
				c.addListener('playback_update', (e) => {
					this.watchForTrackStart(e.data);
					this.watchForEnd(e.data);
					const playing = !e.data.isPaused;
					if (playing && this.holdPaused) c.pause();
					if (playing && this.tapArmed) {
						this.tapArmed = false;
						this.events.onTapped?.();
					}
					if (playing !== this.playing) {
						this.playing = playing;
						if (!this.quiet) this.events.onPlayingChange?.(playing);
					}
				});
			});
		});
		return this.ready;
	}

	/** playback_started fires only once for a signed-in listener, so track changes come from updates. */
	private watchForTrackStart({ playingURI: uri, duration }: PlaybackUpdate) {
		if (!uri || !duration) return;
		const prev = this.current;
		this.current = { uri, duration };
		if (prev && prev.uri === uri && Math.abs(prev.duration - duration) < NEW_TRACK_DURATION_MS) return;
		clearTimeout(this.endTimer);
		this.events.onTrackStart?.(uri, duration);
	}

	/** At the end of a track, either it pauses there or updates stop; if no next track starts, it's over. */
	private watchForEnd({ isPaused, duration, position }: PlaybackUpdate) {
		clearTimeout(this.endTimer);
		if (!duration || position < duration - NEAR_END_MS) return;
		this.endTimer = setTimeout(() => this.events.onEnded?.(), isPaused ? 0 : ENDED_AFTER_MS);
	}

	/**
	 * Pause the music. With hold, keep it paused (even through a track that's still starting)
	 * until resume(): Pete's Jingles use that. Without, someone can press play on the embed.
	 */
	pause({ hold = false } = {}) {
		if (!this.playing) return;
		this.holdPaused = hold;
		this.controller?.pause();
	}

	/**
	 * Safari ignores a play() the page sends, but accepts the listener's own press of the embed's
	 * play button, and after that lets the page pause and resume. So wait for that press (onTapped),
	 * keep the music paused, and resume() once Pete has spoken.
	 */
	holdForTap() {
		this.tapArmed = true;
		this.holdPaused = true;
		this.quiet = true;
	}

	resume() {
		const afterTap = this.quiet;
		this.releaseTapHold();
		this.controller?.resume();
		if (this.playing) this.events.onPlayingChange?.(true);
		// A track paused while it was still starting can ignore resume(): ask again, then start it outright
		if (afterTap) {
			for (const ms of [1200, 2500]) {
				setTimeout(() => {
					if (!this.playing && !this.holdPaused) this.controller?.play();
				}, ms);
			}
		}
	}

	/** May be ignored without a recent tap (Safari); the embed's own play button still works. */
	play() {
		this.releaseTapHold();
		this.controller?.play();
	}

	private releaseTapHold() {
		this.holdPaused = false;
		this.tapArmed = false;
		this.quiet = false;
	}
}
