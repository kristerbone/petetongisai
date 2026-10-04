<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { nextSignOff } from '$lib/dedication/sign-off';
	import { parseSpotifyLink } from '$lib/spotify/link';
	import { SpotifyEmbed } from '$lib/spotify/embed';
	import { TrackIds } from '$lib/track-ids/player';
	import SiteFooter from '$lib/site/SiteFooter.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A silent clip played in the tap unlocks this element, the fallback if Web Audio can't play the Intro
	const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
	let fallbackAudio: HTMLAudioElement;

	let stage = $state<'ready' | 'intro' | 'music' | 'done'>('ready');
	let message = $state('');
	let embedEl = $state<HTMLDivElement>();
	let embed: SpotifyEmbed;
	let trackIds: TrackIds;
	let hasEmbed = $state(false);
	let signedOff = false;
	let showBox = $state(false);
	let playlist = $state('');
	let playlistInvalid = $state(false);

	onMount(() => {
		fallbackAudio = new Audio();
		embed = new SpotifyEmbed(embedEl!, {
			onTrackStart: (uri, durationMs) => trackIds.trackStarted(uri, durationMs),
			// With music, the Sign-off follows the final Track ID
			onEnded: () => trackIds.ended().then(signOff)
		});
		trackIds = new TrackIds(embed);
	});

	async function play() {
		if (data.faded || stage !== 'ready') return;
		stage = 'intro';
		trackIds.unlock();
		fallbackAudio.src = SILENCE;
		fallbackAudio.play().catch(() => {});
		const url = `/d/${data.id}/intro.wav`;
		try {
			await trackIds.playFile(url);
		} catch (e) {
			console.warn('Intro via Web Audio failed, trying an audio element', e);
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`${url}: ${res.status}`);
				fallbackAudio.src = URL.createObjectURL(await res.blob());
				const finished = new Promise((resolve) => (fallbackAudio.onended = resolve));
				await fallbackAudio.play();
				await finished;
			} catch (e2) {
				console.warn('Intro playback failed', e2);
				message = `Couldn’t play the Intro (${e2 instanceof Error ? e2.message : e2}); tap Play again.`;
				stage = 'ready';
				return;
			}
		}
		if (data.spotifyUri) {
			stage = 'music';
			hasEmbed = true;
			trackIds.start(data.spotifyUri);
			await embed.load(data.spotifyUri);
			embed.play();
		} else {
			stage = 'done';
			await signOff();
		}
	}

	/** Pete's Sign-off invites the listener to hand over a playlist; the box appears after it. */
	async function signOff() {
		if (signedOff) return;
		signedOff = true;
		await trackIds.say(nextSignOff());
		showBox = true;
	}

	/** The playlist box opens the desk with the link filled in, ready to Play or Send. */
	function openInDesk(e: SubmitEvent) {
		e.preventDefault();
		const link = parseSpotifyLink(playlist);
		playlistInvalid = !link;
		if (link) goto(`/?link=${encodeURIComponent(playlist.trim())}#play`, { keepFocus: true });
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
		<h1><a href="/">Pete Tong Is AI</a></h1>
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
			{#if showBox}
				<form class="playlist-box" onsubmit={openInDesk} novalidate>
					<div class="section-label">Got a playlist? Pete will tell you what's playing</div>
					<div class="voice-input-row">
						<input
							type="url"
							class="voice-input"
							class:invalid={playlistInvalid}
							placeholder="Spotify playlist or track link"
							bind:value={playlist}
						/>
						<button class="speak-btn">▶ Go</button>
					</div>
					{#if playlistInvalid}
						<div class="last-spoken voice-status" style:display="block">That’s not a Spotify playlist or track link.</div>
					{/if}
				</form>
			{/if}
			<p class="dedication-own"><a class="speak-btn" href="/">Send your own Dedication</a></p>
			<form method="POST" action="?/remove" class="dedication-remove">
				<button>If this offended you, click here to remove it</button>
			</form>
		{/if}
	</div>

	<SiteFooter buttons={false} />
</div>
