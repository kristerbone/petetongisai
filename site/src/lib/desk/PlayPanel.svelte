<script lang="ts">
	import { onMount } from 'svelte';
	import { parseSpotifyLink } from '$lib/spotify/link';
	import { SpotifyEmbed } from '$lib/spotify/embed';
	import { renderIntro, type IntroStatus } from './intro';
	import { decks } from './state.svelte';

	const MAX_CHARS = 200;
	// A silent WAV, played inside the tap so the Intro may play later without one (Safari)
	const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

	let text = $state('');
	let link = $state('');
	let message = $state('');
	let stage = $state<'idle' | IntroStatus | 'intro' | 'music'>('idle');
	let embedEl: HTMLDivElement;
	let embed: SpotifyEmbed;
	let introAudio: HTMLAudioElement;
	let hasEmbed = $state(false);

	const parsed = $derived(link.trim() ? parseSpotifyLink(link) : null);
	const linkInvalid = $derived(link.trim() !== '' && !parsed);
	const busy = $derived(stage === 'checking' || stage === 'warming');

	onMount(() => {
		introAudio = new Audio();
		embed = new SpotifyEmbed(embedEl, {
			onPlayingChange: (playing) => {
				decks.A.playing = playing; // the decks are decorative: they follow the embed
				// Someone pressed play on the embed itself mid-Intro: Pete never talks over the music
				if (playing && !introAudio.paused) introAudio.pause();
			},
			onTrackStart: (uri) => console.debug('track started', uri)
		});
	});

	async function play() {
		const line = text.trim();
		if (busy || linkInvalid || (!line && !parsed)) return;
		message = '';

		if (line) {
			introAudio.src = SILENCE;
			introAudio.play().catch(() => {});
			embed.pause();

			const result = await renderIntro(line, (s) => (stage = s));
			if (!result.ok) {
				stage = 'idle';
				message = {
					rejected: 'Pete’s not saying that one.',
					'rate-limited': `Pete needs a breather: try again in ${Math.ceil((result.retryAfterS ?? 3600) / 60)} minutes.`,
					'off-air': 'Pete’s off air: this month’s hosting budget is used up. Back next month!',
					error: result.message ?? 'Pete couldn’t say that one. Try again in a moment.'
				}[result.reason];
				return;
			}
			stage = 'intro';
			introAudio.src = URL.createObjectURL(result.audio);
			const finished = new Promise((resolve) => (introAudio.onended = introAudio.onpause = resolve));
			try {
				await introAudio.play();
				await finished;
			} catch (e) {
				console.warn('Intro playback failed', e);
				message = 'Your browser blocked Pete; press Play again.';
				stage = 'idle';
				return;
			}
		}

		if (parsed) {
			stage = 'music';
			hasEmbed = true;
			await embed.load(parsed.uri);
			embed.play();
		}
		stage = 'idle';
	}
</script>

<div class="pt-voice-section">
	<div class="section-label"><span class="led"></span>On Air — Pete Introduces Your Track</div>
	<div class="intro-badge">AI voice, not Pete Tong</div>

	<div class="voice-input-row">
		<input
			type="text"
			class="voice-input"
			placeholder="What should Pete say? e.g. This one goes out to Sam, who still owes me a tenner."
			maxlength={MAX_CHARS}
			bind:value={text}
		/>
	</div>
	<div class="text-count">{text.length}/{MAX_CHARS}</div>
	<div class="voice-input-row">
		<input
			type="url"
			class="voice-input"
			class:invalid={linkInvalid}
			placeholder="Spotify track or playlist link (optional)"
			bind:value={link}
			onkeydown={(e) => e.key === 'Enter' && play()}
		/>
		<button class="speak-btn" onclick={play} disabled={busy || linkInvalid || (!text.trim() && !parsed)}>
			{busy ? '…' : '▶ Play'}
		</button>
	</div>
	{#if linkInvalid}
		<div class="last-spoken voice-status" style:display="block">That’s not a Spotify track or playlist link.</div>
	{/if}

	{#if stage === 'checking'}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">Cueing Pete up…</div>
	{:else if stage === 'warming'}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">
			Warming up the decks… the first Intro after a quiet spell takes about a minute
		</div>
	{:else if message}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">{message}</div>
	{/if}

	<div class="spotify-embed" class:visible={hasEmbed}><div bind:this={embedEl}></div></div>
</div>
