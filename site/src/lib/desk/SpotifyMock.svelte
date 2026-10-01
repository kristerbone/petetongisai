<script lang="ts">
	// A mock player kept from v1 so the desk behaves as before. Ticket 06 replaces it
	// with a Spotify embed driven by the iFrame API (ADR 0001).
	import { decks } from './state.svelte';

	let connected = $state(false);
	let playing = $state(false);
	let progress = $state(35);
	let waveform = $state<number[]>([]);

	function connect() {
		connected = true;
		decks.A.track = 'Cafe Del Mar — Energy 52';
		waveform = Array.from({ length: 60 }, () => Math.random() * 24 + 6);
	}

	$effect(() => {
		if (!connected) return;
		const timer = setInterval(() => {
			if (playing) progress = Math.min(100, progress + 0.15);
		}, 500);
		return () => clearInterval(timer);
	});

	function seek(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const pct = ((e.clientX - el.getBoundingClientRect().left) / el.offsetWidth) * 100;
		progress = Math.max(0, Math.min(100, pct));
	}
</script>

<div class="spotify-section">
	<div class="spotify-header">
		<div class="spotify-logo">♫</div>
		<span>Spotify</span>
		<div class="spotify-api-note">Preview — real playback coming</div>
	</div>
	{#if !connected}
		<div>
			<p class="spotify-hint">Connect your Spotify Premium account to load tracks onto the decks</p>
			<button class="spotify-connect-btn" onclick={connect}>Connect Spotify</button>
		</div>
	{/if}
	<div class="spotify-player" class:visible={connected}>
		<div class="intro-badge">Now Playing — Deck A</div>
		<div class="now-playing">
			<div class="track-art">♫</div>
			<div class="track-info">
				<div class="track-name">Cafe Del Mar (Original Mix)</div>
				<div class="track-artist">Energy 52</div>
			</div>
		</div>
		<div class="waveform">
			{#each waveform as height, i (i)}
				<div class="wave-bar" class:active={i < 21} style:height="{height}px"></div>
			{/each}
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div class="progress-bar" onclick={seek}>
			<div class="progress-fill" style:width="{progress}%"></div>
		</div>
		<div class="transport">
			<button class="t-btn" onclick={() => (progress = 0)} aria-label="Previous">⏮</button>
			<button class="t-btn play" onclick={() => (playing = !playing)} aria-label="Play/Pause"
				>{playing ? '⏸' : '▶'}</button
			>
			<button class="t-btn" onclick={() => (progress = 0)} aria-label="Next">⏭</button>
		</div>
		<div class="track-intro-text">
			"Right, this one right here — Cafe Del Mar by Energy 52, the classic '94 Trance anthem that
			defined a generation of Ibiza sunsets. Absolute weapon."
		</div>
	</div>
</div>
