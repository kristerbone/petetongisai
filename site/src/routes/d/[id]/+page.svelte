<script lang="ts">
	import { onMount } from 'svelte';
	import { SpotifyEmbed } from '$lib/spotify/embed';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let stage = $state<'ready' | 'intro' | 'music' | 'done'>('ready');
	let message = $state('');
	let embedEl = $state<HTMLDivElement>();
	let embed: SpotifyEmbed;
	let hasEmbed = $state(false);

	onMount(() => {
		embed = new SpotifyEmbed(embedEl!);
	});

	async function play() {
		if (data.faded || stage !== 'ready') return;
		stage = 'intro';
		// Created inside the tap, so the browser lets it play
		const audio = new Audio(`/d/${data.id}/intro.wav`);
		try {
			await audio.play();
			await new Promise((resolve) => (audio.onended = resolve));
		} catch {
			message = 'Your browser blocked the Intro; tap Play again.';
			stage = 'ready';
			return;
		}
		if (data.spotifyUri) {
			stage = 'music';
			hasEmbed = true;
			await embed.load(data.spotifyUri);
			embed.play();
		} else {
			stage = 'done';
		}
	}
</script>

<svelte:head>
	<title>Someone sent you a Dedication — Pete Tong Is AI</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta property="og:title" content="Someone sent you a Dedication" />
	<meta property="og:description" content="Tap to hear it, introduced by an AI Pete Tong." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Someone sent you a Dedication" />
</svelte:head>

<div class="desk dedication">
	<div class="desk-header">
		<h1>Pete Tong Is AI</h1>
		<p>Someone sent you a Dedication</p>
	</div>

	<div class="pt-voice-section">
		{#if data.faded}
			<p class="dedication-faded">This Dedication has faded out. <a href="/">Send your own.</a></p>
		{:else}
			<div class="section-label"><span class="led"></span>On Air</div>
			<div class="intro-badge">AI voice, not Pete Tong</div>
			<button class="speak-btn dedication-play" onclick={play} disabled={stage !== 'ready'}>
				{stage === 'ready' ? '▶ Play your Dedication' : stage === 'intro' ? 'Pete’s on…' : '♫'}
			</button>
			{#if message}<div class="last-spoken voice-status" style:display="block">{message}</div>{/if}
			<div class="spotify-embed" class:visible={hasEmbed}><div bind:this={embedEl}></div></div>
			<p class="dedication-own"><a href="/">Send your own Dedication</a></p>
			<form method="POST" action="?/remove" class="dedication-remove">
				<button>If this offended you, click here to remove it</button>
			</form>
		{/if}
	</div>
</div>
