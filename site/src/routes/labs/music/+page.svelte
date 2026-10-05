<script lang="ts">
	// Throwaway test bench (not linked anywhere): can the Mixcloud and SoundCloud widgets be started inside a
	// tap, paused, and resumed by the page after Pete speaks? Run on an iPhone and read the log.
	import { onMount } from 'svelte';

	type Widget = { play(): void; pause(): void; isPaused(): Promise<boolean> };
	type Service = {
		name: string;
		link: string;
		src: (link: string) => string;
		widget: Widget | null;
		frame: HTMLIFrameElement | undefined;
	};

	let services = $state<Service[]>([
		{
			name: 'Mixcloud',
			link: '',
			src: (l) => `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=${encodeURIComponent(new URL(l).pathname)}`,
			widget: null,
			frame: undefined
		},
		{
			name: 'SoundCloud',
			link: '',
			src: (l) => `https://w.soundcloud.com/player/?url=${encodeURIComponent(l)}&auto_play=false`,
			widget: null,
			frame: undefined
		}
	]);
	let loaded = $state<Record<string, string>>({});
	let log = $state<string[]>([]);
	let ctx: AudioContext | null = null;

	const say = (m: string) => (log = [`${new Date().toISOString().slice(11, 19)}  ${m}`, ...log].slice(0, 60));

	function script(src: string) {
		return new Promise<void>((resolve, reject) => {
			const el = document.createElement('script');
			el.src = src;
			el.onload = () => resolve();
			el.onerror = () => reject(new Error(`could not load ${src}`));
			document.body.appendChild(el);
		});
	}

	onMount(() => {
		say(`${navigator.userAgent}`);
	});

	async function load(s: Service) {
		try {
			loaded[s.name] = s.src(s.link.trim());
			await new Promise((r) => setTimeout(r, 50)); // let the iframe render
			if (s.name === 'Mixcloud') {
				await script('https://widget.mixcloud.com/media/js/widgetApi.js');
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const w = (window as any).Mixcloud.PlayerWidget(s.frame);
				await w.ready;
				for (const e of ['play', 'pause', 'ended', 'error', 'buffering']) w.events[e].on((...a: unknown[]) => say(`Mixcloud ${e} ${a.length ? JSON.stringify(a) : ''}`));
				s.widget = { play: () => w.play(), pause: () => w.pause(), isPaused: () => w.getIsPaused() };
			} else {
				await script('https://w.soundcloud.com/player/api.js');
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const SC = (window as any).SC;
				const w = SC.Widget(s.frame);
				for (const e of ['PLAY', 'PAUSE', 'FINISH', 'ERROR', 'READY']) w.bind(SC.Widget.Events[e], () => say(`SoundCloud ${e}`));
				s.widget = { play: () => w.play(), pause: () => w.pause(), isPaused: () => new Promise((r) => w.isPaused(r)) };
			}
			say(`${s.name}: widget ready`);
		} catch (e) {
			say(`${s.name}: load failed: ${e instanceof Error ? e.message : e}`);
		}
	}

	/** Test 1: the tap itself asks the widget to play. */
	function playInTap(s: Service) {
		say(`${s.name}: play() inside the tap`);
		s.widget?.play();
		setTimeout(async () => say(`${s.name}: 3s later paused = ${await s.widget?.isPaused()}`), 3000);
	}

	/** Test 2: pause, wait with no tap, and ask the page to resume. */
	function pauseThenResume(s: Service) {
		say(`${s.name}: pause(), then play() again in 5s with no tap`);
		s.widget?.pause();
		setTimeout(() => {
			s.widget?.play();
			setTimeout(async () => say(`${s.name}: resume result paused = ${await s.widget?.isPaused()}`), 2500);
		}, 5000);
	}

	/** Test 3: pause, play a Pete Jingle through Web Audio (as the site does), then resume with no tap. */
	async function pauseJingleResume(s: Service) {
		ctx ??= new AudioContext();
		await ctx.resume();
		say(`${s.name}: pause(), Jingle through Web Audio, then play() with no tap`);
		s.widget?.pause();
		try {
			const buf = await ctx.decodeAudioData(await (await fetch('/jingles/nonstop.mp3')).arrayBuffer());
			const src = ctx.createBufferSource();
			src.buffer = buf;
			src.connect(ctx.destination);
			await new Promise<void>((resolve) => {
				src.onended = () => resolve();
				src.start();
			});
		} catch (e) {
			say(`Jingle failed: ${e}`);
		}
		s.widget?.play();
		setTimeout(async () => say(`${s.name}: resume after Pete, paused = ${await s.widget?.isPaused()}`), 2500);
	}
</script>

<svelte:head>
	<title>Music test bench</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="desk page">
	<div class="desk-header">
		<h1>Test bench</h1>
		<p>Mixcloud and SoundCloud widgets</p>
	</div>

	<div class="page-body">
		{#each services as s (s.name)}
			<h2>{s.name}</h2>
			<input class="voice-input" placeholder="Paste a {s.name} link" bind:value={s.link} />
			<p><button class="speak-btn" onclick={() => load(s)} disabled={!s.link.trim()}>1 · Load</button></p>
			{#if loaded[s.name]}
				<iframe bind:this={s.frame} title={s.name} src={loaded[s.name]} width="100%" height={s.name === 'Mixcloud' ? 120 : 166} frameborder="0" allow="autoplay"></iframe>
				<p><button class="speak-btn" onclick={() => playInTap(s)}>2 · Play in this tap</button></p>
				<p><button class="speak-btn" onclick={() => pauseThenResume(s)}>3 · Pause, resume after 5s</button></p>
				<p><button class="speak-btn" onclick={() => pauseJingleResume(s)}>4 · Pause, Pete jingle, resume</button></p>
			{/if}
		{/each}

		<h2>Log</h2>
		<pre style="white-space: pre-wrap; font-size: 11px">{log.join('\n')}</pre>
	</div>
</div>
