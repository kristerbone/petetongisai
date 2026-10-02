<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { parseSpotifyLink } from '$lib/spotify/link';
	import { SpotifyEmbed } from '$lib/spotify/embed';
	import { TrackIds } from '$lib/track-ids/player';
	import { renderIntro, type IntroStatus } from './intro';
	import { canReplaceSilently, firstSlot, hasSlot, OCCASIONS } from './starters';
	import { onJingle, pete } from './pete-audio.svelte';

	const MAX_CHARS = 500;
	// A silent WAV, played inside the tap so the Intro may play later without one (Safari)
	const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

	let text = $state('');
	let link = $state('');
	let message = $state('');
	let stage = $state<'idle' | IntroStatus | 'intro' | 'music'>('idle');
	let embedEl: HTMLDivElement;
	let embed: SpotifyEmbed;
	let playButton: HTMLButtonElement;
	let textBox: HTMLTextAreaElement;
	// Occasion starters (ticket 16): the last one put in the box, and how far through each chip's lines
	let lastStarter: string | null = null;
	const nextLine: Record<string, number> = {};
	let trackIds: TrackIds;
	let introAudio: HTMLAudioElement;
	let hasEmbed = $state(false);
	// The last Intro that played, which Send can turn into a Dedication
	let sendable = $state<{ introId: string; text: string; link: string } | null>(null);
	let sending = $state(false);
	let sentUrl = $state('');
	let copied = $state(false);
	let canShare = $state(false);

	const parsed = $derived(link.trim() ? parseSpotifyLink(link) : null);
	const linkInvalid = $derived(link.trim() !== '' && !parsed);
	const busy = $derived(stage === 'checking' || stage === 'warming');
	// Editing the text or link after Play means Send would no longer match what was heard
	const canSend = $derived(!!sendable && sendable.text === text.trim() && sendable.link === link.trim());

	onMount(() => {
		canShare = 'share' in navigator;
		introAudio = new Audio();
		embed = new SpotifyEmbed(embedEl, {
			onPlayingChange: (playing) => {
				pete.music = playing; // Deck A follows the embed
				// Someone pressed play on the embed itself mid-Intro: Pete never talks over the music
				if (playing && !introAudio.paused) introAudio.pause();
			},
			onTrackStart: (uri, durationMs) => trackIds.trackStarted(uri, durationMs),
			onEnded: () => trackIds.ended()
		});
		trackIds = new TrackIds(embed);
		// A Jingle pauses the music and picks it back up afterwards
		let resumeAfterJingle = false;
		return onJingle((speaking) => {
			if (speaking && embed.playing) {
				resumeAfterJingle = true;
				embed.pause({ hold: true });
			} else if (!speaking && resumeAfterJingle) {
				resumeAfterJingle = false;
				embed.resume();
			}
		});
	});

	/** Fill the box with the occasion's next starter and select its first slot, so typing replaces it. */
	async function useStarter(occasion: (typeof OCCASIONS)[number]) {
		if (!canReplaceSilently(text, lastStarter) && !confirm('Replace your text?')) return;
		const i = nextLine[occasion.id] ?? 0;
		nextLine[occasion.id] = (i + 1) % occasion.lines.length;
		text = lastStarter = occasion.lines[i];
		message = '';
		await tick();
		selectSlot();
	}

	function selectSlot() {
		const slot = firstSlot(text);
		textBox.focus();
		if (slot) textBox.setSelectionRange(slot.start, slot.end);
	}

	async function play() {
		const line = text.trim();
		if (busy || linkInvalid || (!line && !parsed)) return;
		// Checked before anything is sent, so a half-filled starter never uses up a Play
		if (hasSlot(line)) {
			message = 'Fill in the [ ] bits first 🙂';
			selectSlot();
			return;
		}
		message = '';
		sentUrl = '';
		trackIds.unlock();

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
			sendable = { introId: result.id, text: line, link: link.trim() };
			introAudio.src = URL.createObjectURL(result.audio);
			const finished = new Promise((resolve) => (introAudio.onended = introAudio.onpause = resolve));
			try {
				pete.speaking = true;
				await introAudio.play();
				await finished;
			} catch (e) {
				console.warn('Intro playback failed', e);
				message = 'Your browser blocked Pete; press Play again.';
				stage = 'idle';
				return;
			} finally {
				pete.speaking = false;
			}
		}

		if (parsed) {
			stage = 'music';
			hasEmbed = true;
			trackIds.start(parsed.uri);
			await embed.load(parsed.uri);
			embed.play();
		}
		stage = 'idle';
	}

	async function send() {
		if (!sendable || sending) return;
		sending = true;
		message = '';
		const res = await fetch('/api/dedications', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ introId: sendable.introId, spotifyUri: parsed?.uri ?? null })
		});
		sending = false;
		if (!res.ok) {
			message = (await res.json().catch(() => null))?.message ?? 'Couldn’t send that one. Try again.';
			if (res.status === 410) sendable = null;
			return;
		}
		sentUrl = (await res.json()).url;
	}

	async function copy() {
		await navigator.clipboard.writeText(sentUrl);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function share() {
		navigator.share({ title: 'Someone sent you a Dedication', url: sentUrl }).catch(() => {});
	}
</script>

<div class="pt-voice-section" id="play">
	<div class="section-label"><span class="led"></span>On Air — Pete Introduces Your Track</div>
	<div class="intro-badge">AI voice, not Pete Tong</div>

	<div class="starters" role="group" aria-label="Occasion starters">
		<span class="starters-label">Need an idea?</span>
		{#each OCCASIONS as occasion (occasion.id)}
			<button type="button" class="starter-chip" onclick={() => useStarter(occasion)}>{occasion.emoji} {occasion.label}</button>
		{/each}
	</div>
	<div class="voice-input-row">
		<textarea
			bind:this={textBox}
			class="voice-input intro-text"
			rows="3"
			placeholder="What should Pete say? e.g. This one goes out to Sam, who still owes me a tenner."
			maxlength={MAX_CHARS}
			bind:value={text}
		></textarea>
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
		<button class="speak-btn" bind:this={playButton} onclick={play} disabled={busy || linkInvalid || (!text.trim() && !parsed)}>
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

	{#if canSend && !sentUrl}
		<button class="spotify-connect-btn send-btn" onclick={send} disabled={sending}>
			{sending ? 'Sending…' : '✉ Send this as a Dedication'}
		</button>
	{/if}
	{#if sentUrl}
		<div class="sent-link">
			<input class="voice-input" readonly value={sentUrl} onfocus={(e) => e.currentTarget.select()} />
			<button class="speak-btn" onclick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
			{#if canShare}<button class="speak-btn" onclick={share}>Share</button>{/if}
		</div>
		<div class="last-spoken voice-status" style:display="block">Anyone with this link can hear it. It fades if nobody opens it for 30 days.</div>
	{/if}

	<div class="spotify-embed" class:visible={hasEmbed}><div bind:this={embedEl}></div></div>
</div>
