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
	/** The embed started or stopped playing (the decks reflect this). */
	onPlayingChange?: (playing: boolean) => void;
	/** A track began playing; Track IDs (ticket 13) build on this. */
	onTrackStart?: (uri: string) => void;
};

export class SpotifyEmbed {
	private controller: EmbedController | null = null;
	private ready: Promise<void> | null = null;
	playing = false;

	constructor(
		private el: HTMLElement,
		private events: EmbedEvents = {}
	) {}

	/** Load a track or playlist URI into the embed (creating it the first time). */
	async load(uri: string) {
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
				c.addListener('playback_started', (e) => this.events.onTrackStart?.(e.data.playingURI));
				c.addListener('playback_update', (e) => {
					const playing = !e.data.isPaused;
					if (playing !== this.playing) {
						this.playing = playing;
						this.events.onPlayingChange?.(playing);
					}
				});
			});
		});
		return this.ready;
	}

	/** May be ignored without a recent tap (Safari); the embed's own play button still works. */
	play() {
		this.controller?.play();
	}

	pause() {
		if (this.playing) this.controller?.pause();
	}
}
