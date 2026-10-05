<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { nextSignOff } from '$lib/dedication/sign-off';
	import { parseMusicLink } from '$lib/music/link';
	import { MusicPlayer } from '$lib/music/player';
	import Lamps from '$lib/desk/Lamps.svelte';
	import { pete, resetPete } from '$lib/desk/pete-audio.svelte';
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
	let embed: MusicPlayer;
	let trackIds: TrackIds;
	let hasEmbed = $state(false);
	let loading: Promise<void> | undefined;
	// The Sign-off and Track IDs wait until Pete has spoken; music that ends first (a 30 second preview) is only filler
	let introHeard = false;
	let signedOff = false;
	let played = $state(false);
	let showBox = $state(false);
	let playlist = $state('');
	let playlistInvalid = $state(false);

	onMount(() => {
		introAudio = new Audio();
		embed = new MusicPlayer(embedEl!, {
			onPlayingChange: (playing) => {
				pete.music = playing;
				if (playing) message = '';
			},
			onTrackStart: (uri, durationMs) => trackIds.trackStarted(uri, durationMs),
			// With music, the Sign-off follows the final Track ID
			onEnded: () => (introHeard ? trackIds.ended().then(signOff) : undefined)
		});
		trackIds = new TrackIds(embed);
		if (!data.faded && data.music) {
			// Shown up front: a press of its play button gives filler music, and the page may pause and resume it (iOS)
			hasEmbed = true;
			// Track IDs name Spotify tracks; a Mixcloud show is one long mix, so it has none
			if (data.music.startsWith('spotify:')) {
				trackIds.start(data.music);
				trackIds.silenced = true; // filler until Pete's Intro has played
			}
			loading = embed.load(data.music);
		}
		// Leaving for the desk removes the player without a pause event, so the Tunes lamp would stay lit
		return resetPete;
	});

	/**
	 * Pete's Intro. With music it plays through Web Audio, not an audio element: a second media element
	 * playing would interrupt the Spotify player on iOS, and then the page couldn't resume it.
	 */
	async function playIntro(url: string, withMusic: boolean) {
		const viaElement = async () => {
			// Fetched whole and played on the element unlocked in the tap: iOS won't stream from a server without Range
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${url}: ${res.status}`);
			introAudio.src = URL.createObjectURL(await res.blob());
			const finished = new Promise((resolve) => (introAudio.onended = resolve));
			await introAudio.play();
			await finished;
		};
		const [first, second] = withMusic ? [() => trackIds.playFile(url), viaElement] : [viaElement, () => trackIds.playFile(url)];
		try {
			await first();
		} catch (e) {
			console.warn('Intro playback failed, trying the other way', e);
			await second();
		}
	}

	async function play() {
		if (data.faded || stage !== 'ready') return;
		stage = 'intro';
		const withMusic = !!data.music;
		trackIds.unlock();
		// Filler the listener started: Pete never talks over music, so pause it and pick it up afterwards
		const musicWasPlaying = embed.playing;
		if (withMusic) {
			// Start the music inside this tap and keep it paused: Safari then lets the page resume it after Pete
			if (embed.playing) embed.pause({ hold: true });
			else embed.unlock();
		} else {
			// A silent clip played in the tap unlocks the element for the Intro that follows
			introAudio.src = SILENCE;
			introAudio.play().catch(() => {});
		}
		pete.speaking = true;
		try {
			await playIntro(`/d/${data.id}/intro.wav`, withMusic);
		} catch (e) {
			console.warn('Intro playback failed', e);
			message = `Couldn’t play the Intro (${e instanceof Error ? e.message : e}); tap Play again.`;
			pete.speaking = false;
			if (musicWasPlaying) embed.resume();
			else embed.release();
			stage = 'ready';
			return;
		}
		pete.speaking = false;
		introHeard = true;
		trackIds.silenced = false;
		if (withMusic) {
			stage = 'music';
			// A show runs for hours, so its Sign-off (and the box that follows it) would hardly ever come: offer the box now
			if (data.music!.startsWith('mixcloud:')) showBox = true;
			await loading;
			embed.resume();
			// iOS can ignore a play or resume the page sends; the listener then presses play on the embed
			await new Promise((resolve) => setTimeout(resolve, 3000));
			if (!embed.playing) message = 'Tap ▶ on the player below to start the music.';
		} else {
			stage = 'done';
			await signOff();
		}
		played = true;
		stage = 'ready';
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
		const link = parseMusicLink(playlist);
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
			<button class="speak-btn dedication-play" onclick={play} disabled={stage !== 'ready'}>
				{stage === 'ready' ? (played ? '↻ Play it again' : '▶ Play your Dedication') : stage === 'intro' ? 'Pete’s on…' : '♫'}
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
							placeholder="Spotify or Mixcloud link"
							bind:value={playlist}
						/>
						<button class="speak-btn">▶ Go</button>
					</div>
					{#if playlistInvalid}
						<div class="last-spoken voice-status" style:display="block">That’s not a Spotify track, playlist or Mixcloud show link.</div>
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
