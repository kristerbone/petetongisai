/** What the pages need from whichever service is playing (ADR 0005): Spotify and Mixcloud both fit. */
export interface MusicEmbed {
	/** The music is playing right now. */
	playing: boolean;
	/** A pause is being held (Pete is speaking). */
	readonly held: boolean;
	load(uri: string): Promise<void>;
	/** May be ignored without a recent tap (Safari). */
	play(): void;
	pause(options?: { hold?: boolean }): void;
	resume(): void;
	/** Inside the listener's tap: start the music and keep it paused until resume(). */
	unlock(): void;
	/** Let go of a hold without starting anything. */
	release(): void;
}
