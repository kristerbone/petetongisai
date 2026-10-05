import { describe, expect, it, vi } from 'vitest';
import { MixcloudEmbed, type MixcloudWidget } from './mixcloud';

/** A stand-in for Mixcloud's widget that lets a test fire its events. */
function fakeWidget() {
	const listeners: Record<string, (() => void)[]> = {};
	const widget = {
		play: vi.fn(),
		pause: vi.fn(),
		load: vi.fn(async () => {}),
		on: (event: string, listener: () => void) => (listeners[event] ??= []).push(listener)
	} satisfies MixcloudWidget & Record<string, unknown>;
	const fire = (event: string) => listeners[event]?.forEach((l) => l());
	return { widget, fire };
}

async function loaded() {
	const { widget, fire } = fakeWidget();
	const changes: boolean[] = [];
	const ended = vi.fn();
	const embed = new MixcloudEmbed({} as HTMLElement, { onPlayingChange: (p) => changes.push(p), onEnded: ended }, { create: async () => widget });
	await embed.load('/BBCRadio1/essential-mix/');
	return { embed, widget, fire, changes, ended };
}

describe('MixcloudEmbed', () => {
	it('follows the widget: playing, paused, ended', async () => {
		const { embed, fire, changes, ended } = await loaded();
		fire('play');
		expect(embed.playing).toBe(true);
		fire('pause');
		expect(embed.playing).toBe(false);
		fire('play');
		fire('ended');
		expect(changes).toEqual([true, false, true, false]);
		expect(ended).toHaveBeenCalledTimes(1);
	});

	it('unlock() starts the music inside the tap but keeps it paused until resume()', async () => {
		const { embed, widget, fire } = await loaded();
		embed.unlock();
		expect(widget.play).toHaveBeenCalledTimes(1);
		fire('play'); // the music starts, and the hold pauses it again
		expect(widget.pause).toHaveBeenCalledTimes(1);
		expect(embed.held).toBe(true);
		fire('pause');
		embed.resume();
		expect(embed.held).toBe(false);
		expect(widget.play).toHaveBeenCalledTimes(2);
	});

	it('pauses for Pete, held, and picks the music up again', async () => {
		const { embed, widget, fire } = await loaded();
		fire('play');
		embed.pause({ hold: true });
		expect(widget.pause).toHaveBeenCalledTimes(1);
		fire('play'); // a stray play while Pete speaks
		expect(widget.pause).toHaveBeenCalledTimes(2);
		fire('pause');
		embed.resume();
		expect(widget.play).toHaveBeenCalledTimes(1);
	});

	it('asks again if the first resume is ignored', async () => {
		vi.useFakeTimers();
		try {
			const { embed, widget, fire } = await loaded();
			fire('play');
			embed.pause({ hold: true });
			fire('pause');
			embed.resume();
			vi.advanceTimersByTime(1300);
			expect(widget.play).toHaveBeenCalledTimes(2);
			fire('play'); // it came back
			vi.advanceTimersByTime(2000);
			expect(widget.play).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('if the browser refuses a play, the next click anywhere asks again', async () => {
		vi.useFakeTimers();
		const clicks: (() => void)[] = [];
		vi.stubGlobal('document', { addEventListener: (_: string, listener: () => void) => clicks.push(listener) });
		try {
			const { embed, widget } = await loaded();
			embed.play(); // blocked: no play event comes back
			vi.advanceTimersByTime(1600);
			expect(clicks).toHaveLength(1);
			clicks[0](); // the click
			expect(widget.play).toHaveBeenCalledTimes(2);
		} finally {
			vi.unstubAllGlobals();
			vi.useRealTimers();
		}
	});

	it('does not wait for a click when the music is playing or held for Pete', async () => {
		vi.useFakeTimers();
		const clicks: (() => void)[] = [];
		vi.stubGlobal('document', { addEventListener: (_: string, listener: () => void) => clicks.push(listener) });
		try {
			const { embed, fire } = await loaded();
			embed.play();
			fire('play'); // it started
			embed.unlock(); // held paused for Pete
			vi.advanceTimersByTime(3000);
			expect(clicks).toHaveLength(0);
		} finally {
			vi.unstubAllGlobals();
			vi.useRealTimers();
		}
	});

	it('ignores pause() when nothing is playing, and switches show without reloading the frame', async () => {
		const { embed, widget } = await loaded();
		embed.pause({ hold: true });
		expect(widget.pause).not.toHaveBeenCalled();
		expect(embed.held).toBe(false);
		await embed.load('/Someone/another-mix/');
		expect(widget.load).toHaveBeenCalledWith('/Someone/another-mix/', false);
	});
});
