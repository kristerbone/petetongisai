<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { nextSignOff } from '$lib/dedication/sign-off';
	import { parseSpotifyLink } from '$lib/spotify/link';
	import { SpotifyEmbed } from '$lib/spotify/embed';
	import Lamps from '$lib/desk/Lamps.svelte';
	import { pete } from '$lib/desk/pete-audio.svelte';
	import { TrackIds } from '$lib/track-ids/player';
	import SiteFooter from '$lib/site/SiteFooter.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// A silent clip played in the tap unlocks this element, where the Intro plays; Web Audio is the fallback
	const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
	let introAudio: HTMLAudioElement;

	let stage = $state<'ready' | 'intro' | 'music' | 'done'>('ready');
	let message = $state('');
	let embedEl = $state<HTMLDivElement>();
	let embed: SpotifyEmbed;
	let trackIds: TrackIds;
	let hasEmbed = $state(false);
	let loading: Promise<void> | undefined;
	// The Sign-off and Track IDs wait until Pete has spoken; music that ends first (a 30 second preview) is only filler
	let introHeard = false;
	let signedOff = false;
	let showBox = $state(false);
	let playlist = $state('');
	let playlistInvalid = $state(false);

	onMount(() => {
		introAudio = new Audio();
		embed = new SpotifyEmbed(embedEl!, {
			onPlayingChange: (playing) => {
				pete.music = playing;
				if (playing) message = '';
			},
			onTrackStart: (uri, durationMs) => trackIds.trackStarted(uri, durationMs),
			// With music, the Sign-off follows the final Track ID
			onEnded: () => (introHeard ? trackIds.ended().then(signOff) : undefined)
		});
		trackIds = new TrackIds(embed);
		if (!data.faded && data.spotifyUri) {
			// Shown up front: a press of its play button gives filler music, and the page may pause and resume it (iOS)
			hasEmbed = true;
			trackIds.start(data.spotifyUri);
			loading = embed.load(data.spotifyUri);
		}
	});

	async function play() {
		if (data.faded || stage !== 'ready') return;
		stage = 'intro';
		trackIds.unlock();
		// Filler the listener started: Pete never talks over music, so pause it and pick it up afterwards
		const musicWasPlaying = embed.playing;
		embed.pause({ hold: true });
		introAudio.src = SILENCE;
		introAudio.play().catch(() => {});
		const url = `/d/${data.id}/intro.wav`;
		pete.speaking = true;
		try {
			// Fetched whole and played on the element unlocked above: iOS won't stream from a server without Range
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${url}: ${res.status}`);
			introAudio.src = URL.createObjectURL(await res.blob());
			const finished = new Promise((resolve) => (introAudio.onended = resolve));
			await introAudio.play();
			await finished;
		} catch (e) {
			console.warn('Intro via an audio element failed, trying Web Audio', e);
			try {
				await trackIds.playFile(url);
			} catch (e2) {
				console.warn('Intro playback failed', e2);
				message = `Couldn’t play the Intro (${e2 instanceof Error ? e2.message : e2}); tap Play again.`;
				pete.speaking = false;
				if (musicWasPlaying) embed.resume();
				stage = 'ready';
				return;
			}
		}
		pete.speaking = false;
		introHeard = true;
		if (data.spotifyUri) {
			stage = 'music';
			await loading;
			if (musicWasPlaying) {
				embed.resume();
			} else {
				embed.play();
			}
			// iOS can ignore a play or resume the page sends; the listener then presses play on the embed
			await new Promise((resolve) => setTimeout(resolve, 3000));
			if (!embed.playing) message = 'Tap ▶ on the player below to start the music.';
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
			<Lamps />
			<div class="intro-badge">AI voice, not Pete Tong</div>
			<div class="spotify-embed" class:visible={hasEmbed}><div bind:this={embedEl}></div></div>
			{#if data.spotifyUri && stage === 'ready'}
				<p class="tap-hint">Tap ▶ on the player for some music while you wait, then press Play your Dedication.</p>
			{/if}
			<button class="speak-btn dedication-play" onclick={play} disabled={stage !== 'ready'}>
				{stage === 'ready' ? '▶ Play your Dedication' : stage === 'intro' ? 'Pete’s on…' : '♫'}
			</button>
			{#if message}<div class="last-spoken voice-status" style:display="block">{message}</div>{/if}
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
