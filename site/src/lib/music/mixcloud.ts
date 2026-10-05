/**
 * Mixcloud's widget (ADR 0005), driven like the Spotify embed: the listener's tap can start it, and
 * the page may pause it for Pete and resume it afterwards (tested on iOS Safari). A show is one long
 * mix, so there are no track starts to report and so no Track IDs (ticket 13 is Spotify-only).
 * https://www.mixcloud.com/developers/widget/
 */
import type { EmbedEvents } from '$lib/spotify/embed';
import type { MusicEmbed } from './types';

/** The part of Mixcloud's PlayerWidget this uses, so tests can stand in for it. */
export type MixcloudWidget = {
	play(): void;
	pause(): void;
	/** Switch to another show without reloading the iframe. */
	load(key: string, startPlaying: boolean): Promise<void> | void;
	on(event: 'play' | 'pause' | 'ended', listener: () => void): void;
};

export type MixcloudDeps = {
	/** Put the widget in `el` showing `key` (e.g. `/BBCRadio1/essential-mix/`) and resolve once it's ready. */
	create(el: HTMLElement, key: string): Promise<MixcloudWidget>;
};

export class MixcloudEmbed implements MusicEmbed {
	private widget: MixcloudWidget | null = null;
	private holdPaused = false;
	private key: string | null = null;
	playing = false;

	constructor(
		private el: HTMLElement,
		private events: EmbedEvents = {},
		private deps: MixcloudDeps = browserDeps
	) {}

	/** A pause is being held (Pete is speaking): a play that still gets through is about to be paused again. */
	get held() {
		return this.holdPaused;
	}

	async load(key: string) {
		if (this.widget) {
			if (key !== this.key) await this.widget.load(key, false);
			this.key = key;
			this.setPlaying(false);
			return;
		}
		this.key = key;
		const widget = await this.deps.create(this.el, key);
		widget.on('play', () => {
			if (this.holdPaused) widget.pause();
			this.setPlaying(true);
		});
		widget.on('pause', () => this.setPlaying(false));
		widget.on('ended', () => {
			this.setPlaying(false);
			this.events.onEnded?.();
		});
		this.widget = widget;
	}

	private setPlaying(playing: boolean) {
		if (playing === this.playing) return;
		this.playing = playing;
		this.events.onPlayingChange?.(playing);
	}

	pause({ hold = false } = {}) {
		if (!this.playing) return;
		this.holdPaused = hold;
		this.widget?.pause();
	}

	/** Continue after a pause(); asked again if the first request is ignored. */
	resume() {
		this.holdPaused = false;
		this.widget?.play();
		for (const ms of [1200, 2500]) {
			setTimeout(() => {
				if (!this.playing && !this.holdPaused) this.widget?.play();
			}, ms);
		}
	}

	play() {
		this.holdPaused = false;
		this.widget?.play();
	}

	/** Call inside the listener's tap: start the music and keep it paused until resume(). */
	unlock() {
		this.holdPaused = true;
		this.widget?.play();
	}

	release() {
		this.holdPaused = false;
	}
}

type MixcloudGlobal = {
	PlayerWidget(frame: HTMLIFrameElement): {
		ready: Promise<unknown>;
		play(): Promise<void>;
		pause(): Promise<void>;
		load(key: string, startPlaying: boolean): Promise<void>;
		events: Record<'play' | 'pause' | 'ended', { on(listener: () => void): void }>;
	};
};

let apiPromise: Promise<MixcloudGlobal> | null = null;
function loadApi(): Promise<MixcloudGlobal> {
	apiPromise ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://widget.mixcloud.com/media/js/widgetApi.js';
		script.onload = () => resolve((window as unknown as { Mixcloud: MixcloudGlobal }).Mixcloud);
		script.onerror = () => {
			apiPromise = null;
			reject(new Error('The Mixcloud player did not load'));
		};
		document.body.appendChild(script);
	});
	return apiPromise;
}

const browserDeps: MixcloudDeps = {
	async create(el, key) {
		const frame = document.createElement('iframe');
		frame.title = 'Mixcloud player';
		frame.width = '100%';
		frame.height = '120';
		frame.style.border = '0';
		frame.allow = 'autoplay';
		frame.src = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(key)}`;
		el.appendChild(frame);
		const widget = (await loadApi()).PlayerWidget(frame);
		await widget.ready;
		return {
			play: () => void widget.play().catch(() => {}),
			pause: () => void widget.pause().catch(() => {}),
			load: (k, start) => widget.load(k, start),
			on: (event, listener) => widget.events[event].on(listener)
		};
	}
};
