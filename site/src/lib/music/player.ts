import { SpotifyEmbed, type EmbedEvents } from '$lib/spotify/embed';
import { MixcloudEmbed } from './mixcloud';
import { mixcloudKey } from './link';
import type { MusicEmbed } from './types';

/**
 * The one player a page holds, whatever the music's service: it keeps a Spotify and a Mixcloud
 * embed, shows whichever the current uri belongs to, and passes every call to it (ADR 0005).
 */
export class MusicPlayer implements MusicEmbed {
	private spotify: { embed: SpotifyEmbed; box: HTMLElement } | null = null;
	private mixcloud: { embed: MixcloudEmbed; box: HTMLElement } | null = null;
	private current: MusicEmbed | null = null;

	constructor(
		private el: HTMLElement,
		private events: EmbedEvents = {}
	) {}

	get playing() {
		return this.current?.playing ?? false;
	}
	set playing(value: boolean) {
		if (this.current) this.current.playing = value;
	}
	get held() {
		return this.current?.held ?? false;
	}

	/** `uri` is `spotify:track:…`, `spotify:playlist:…` or `mixcloud:/user/show/`. */
	async load(uri: string) {
		const isMixcloud = uri.startsWith('mixcloud:');
		const spotify = (this.spotify ??= this.engine((el) => new SpotifyEmbed(el, this.events)));
		const mixcloud = (this.mixcloud ??= this.engine((el) => new MixcloudEmbed(el, this.events)));
		const [next, other] = isMixcloud ? [mixcloud, spotify] : [spotify, mixcloud];
		if (this.current && this.current !== next.embed) this.current.pause();
		this.current = next.embed;
		next.box.style.display = '';
		other.box.style.display = 'none';
		await next.embed.load(isMixcloud ? mixcloudKey(uri) : uri);
	}

	private engine<T extends MusicEmbed>(make: (el: HTMLElement) => T) {
		// Spotify swaps the element it's given for its iframe, so hide and show the wrapper around it
		const box = document.createElement('div');
		const inner = document.createElement('div');
		box.appendChild(inner);
		this.el.appendChild(box);
		return { embed: make(inner), box };
	}

	play() {
		this.current?.play();
	}
	pause(options?: { hold?: boolean }) {
		this.current?.pause(options);
	}
	resume() {
		this.current?.resume();
	}
	unlock() {
		this.current?.unlock();
	}
	release() {
		this.current?.release();
	}
}
