<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { parseMusicLink } from '$lib/music/link';
	import { MusicPlayer } from '$lib/music/player';
	import { TrackIds } from '$lib/track-ids/player';
	import { renderIntro, type IntroStatus } from './intro';
	import { canReplaceSilently, firstSlot, hasSlot, OCCASIONS } from './starters';
	import { onJingle, pete, resetPete } from './pete-audio.svelte';

	const MAX_CHARS = 500;
	// A silent WAV, played inside the tap so the Intro may play later without one (Safari)
	const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

	let text = $state('');
	let link = $state('');
	let message = $state('');
	let stage = $state<'idle' | IntroStatus | 'ready' | 'intro' | 'music'>('idle');
	let embedEl: HTMLDivElement;
	let embed: MusicPlayer;
	let playButton: HTMLButtonElement;
	let textBox: HTMLTextAreaElement;
	// Occasion starters (ticket 16): the last one put in the box, and how far through each chip's lines
	let lastStarter: string | null = null;
	const nextLine: Record<string, number> = {};
	let trackIds: TrackIds;
	let introAudio: HTMLAudioElement;
	let hasEmbed = $state(false);
	let embedReady = $state(false);
	// The player loads as soon as a valid link is in the box, so Play's tap can start it (Safari only accepts that during a tap)
	let preloadedUri: string | null = null;
	// With a link, the player shows while Pete's clip renders so the listener can start some music, and the
	// Intro then waits for them to press Hear Pete, which pauses the music, plays Pete and picks the music up again
	let readyIntro: Blob | null = null;
	let loading: Promise<void> | undefined;
	// Music that ends before Pete has spoken (a 30 second preview) is only filler: no Track ID for it
	let fillerOnly = false;
	// The last Intro that played, which Send can turn into a Dedication
	let sendable = $state<{ introId: string; text: string; link: string } | null>(null);
	let sending = $state(false);
	let sentUrl = $state('');
	let copied = $state(false);
	let canShare = $state(false);

	const parsed = $derived(link.trim() ? parseMusicLink(link) : null);
	const linkInvalid = $derived(link.trim() !== '' && !parsed);
	const busy = $derived(stage === 'checking' || stage === 'warming');
	// Editing the text or link after Play means Send would no longer match what was heard
	const canSend = $derived(!!sendable && sendable.text === text.trim() && sendable.link === link.trim());

	$effect(() => {
		if (!embedReady || !parsed || parsed.uri === preloadedUri) return;
		preloadedUri = parsed.uri;
		hasEmbed = true;
		loading = embed.load(parsed.uri);
	});

	onMount(() => {
		canShare = 'share' in navigator;
		introAudio = new Audio();
		embed = new MusicPlayer(embedEl, {
			onPlayingChange: (playing) => {
				pete.music = playing; // the Tunes lamp follows the embed
				if (playing) message = '';
				// Someone pressed play on the embed itself mid-Intro: Pete never talks over the music
				if (playing && !embed.held && !introAudio.paused) introAudio.pause();
			},
			onTrackStart: (uri, durationMs) => trackIds.trackStarted(uri, durationMs),
			onEnded: () => (fillerOnly ? undefined : trackIds.ended())
		});
		trackIds = new TrackIds(embed);
		embedReady = true;
		// A Jingle pauses the music and picks it back up afterwards
		let resumeAfterJingle = false;
		const offJingle = onJingle((speaking) => {
			if (speaking && embed.playing) {
				resumeAfterJingle = true;
				embed.pause({ hold: true });
			} else if (!speaking && resumeAfterJingle) {
				resumeAfterJingle = false;
				embed.resume();
			}
		});
		return () => {
			offJingle();
			resetPete();
		};
	});

	/** Track IDs name Spotify tracks; a Mixcloud show is one long mix, so it has none. */
	function startTrackIds(uri: string) {
		if (uri.startsWith('spotify:')) trackIds.start(uri);
	}

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
		readyIntro = null;
		fillerOnly = false;
		trackIds.silenced = false;
		trackIds.unlock();

		if (line) {
			// With music, Pete plays through Web Audio: an audio element playing would interrupt the Spotify player on iOS
			if (!parsed) {
				introAudio.src = SILENCE;
				introAudio.play().catch(() => {});
			}
			if (parsed) {
				// Started inside this tap, as filler while the clip renders; Hear Pete pauses it for Pete
				hasEmbed = true;
				startTrackIds(parsed.uri);
				fillerOnly = true;
				trackIds.silenced = true;
				if (preloadedUri !== parsed.uri) {
					preloadedUri = parsed.uri;
					loading = embed.load(parsed.uri);
				}
				embed.play();
			} else {
				embed.pause();
			}

			const result = await renderIntro(line, (s) => (stage = s));
			if (!result.ok) {
				stage = 'idle';
				fillerOnly = false;
				trackIds.silenced = false;
				message = {
					rejected: 'Pete’s not saying that one. He sticks to dedications and shout-outs, so try saying who it’s for and what you’re celebrating.',
					'rate-limited': `Pete needs a breather: try again in ${Math.ceil((result.retryAfterS ?? 3600) / 60)} minutes.`,
					'off-air': 'Pete’s off air: this month’s hosting budget is used up. Back next month!',
					error: result.message ?? 'Pete couldn’t say that one. Try again in a moment.'
				}[result.reason];
				return;
			}
			sendable = { introId: result.id, text: line, link: link.trim() };
			if (!parsed) {
				await speak(result.audio);
				return;
			}
			// With music, wait for the listener: the Hear Pete tap unlocks Pete's audio, and music they
			// started on the embed is paused for Pete and resumed after (iOS lets a page do that, not start it)
			readyIntro = result.audio;
			stage = 'ready';
			return;
		}

		if (parsed) {
			stage = 'music';
			hasEmbed = true;
			startTrackIds(parsed.uri);
			if (preloadedUri !== parsed.uri) {
				preloadedUri = parsed.uri;
				loading = embed.load(parsed.uri);
			}
			embed.play();
			await loading;
			embed.play();
		}
		stage = 'idle';
	}

	/** Play an Intro, then (when it waited on the listener) bring the music back. */
	async function speak(audio: Blob) {
		const withMusic = !!readyIntro;
		trackIds.unlock();
		stage = 'intro';
		// Pete never talks over music: pause what the listener started, held so it can't creep back in
		const musicWasPlaying = withMusic && embed.playing;
		if (withMusic) embed.pause({ hold: true });
		try {
			pete.speaking = true;
			const viaElement = async () => {
				introAudio.src = URL.createObjectURL(audio);
				const finished = new Promise((resolve) => (introAudio.onended = introAudio.onpause = resolve));
				await introAudio.play();
				await finished;
			};
			if (withMusic) {
				// Web Audio, not an audio element: a second media element playing would interrupt the player on iOS
				await trackIds.playBlob(audio).catch((e) => {
					console.warn('Intro via Web Audio failed, trying an audio element', e);
					return viaElement();
				});
			} else {
				await viaElement();
			}
		} catch (e) {
			console.warn('Intro playback failed', e);
			message = 'Your browser blocked Pete; press Hear Pete again.';
			if (musicWasPlaying) embed.resume();
			stage = withMusic ? 'ready' : 'idle';
			return;
		} finally {
			pete.speaking = false;
		}
		if (!withMusic) {
			stage = 'idle';
			return;
		}
		readyIntro = null;
		fillerOnly = false;
		trackIds.silenced = false;
		stage = 'music';
		await loading;
		if (musicWasPlaying) embed.resume();
		else embed.play();
		// iOS can ignore a play or resume the page sends; the listener then presses play on the embed
		await new Promise((resolve) => setTimeout(resolve, 3000));
		if (!embed.playing) {
			message = parsed?.service === 'mixcloud' ? 'Click anywhere to start the music.' : 'Tap ▶ on the player below to start the music.';
		}
		stage = 'idle';
	}

	function hearPete() {
		if (stage === 'ready' && readyIntro) speak(readyIntro);
	}

	async function send() {
		if (!sendable || sending) return;
		sending = true;
		message = '';
		const res = await fetch('/api/dedications', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ introId: sendable.introId, music: parsed?.uri ?? null })
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
	<div class="section-label">Pete Introduces Your Track</div>
	<div class="intro-badge">AI voice, not Pete Tong</div>

	<div class="starters" role="group" aria-label="Occasion starters">
		{#each OCCASIONS as occasion (occasion.id)}
			<button type="button" class="starter-chip" aria-label={occasion.label} onclick={() => useStarter(occasion)}>
				<span class="starter-emoji" aria-hidden="true">{occasion.emoji}</span>
				<span class="starter-text">{occasion.label}</span>
			</button>
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
			placeholder="Spotify or Mixcloud link (optional)"
			bind:value={link}
			onkeydown={(e) => e.key === 'Enter' && play()}
		/>
		<button class="speak-btn" bind:this={playButton} onclick={play} disabled={busy || linkInvalid || (!text.trim() && !parsed)}>
			{busy ? '…' : '▶ Play'}
		</button>
	</div>
	{#if linkInvalid}
		<div class="last-spoken voice-status" style:display="block">That’s not a Spotify track, playlist or Mixcloud show link.</div>
	{/if}

	{#if stage === 'checking'}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">Cueing Pete up…{hasEmbed ? ' Press ▶ on the player for some music while you wait.' : ''}</div>
	{:else if stage === 'warming'}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">
			Warming up Pete… the first Intro after a quiet spell takes about a minute{hasEmbed ? '. Tap ▶ on the player for some music while you wait.' : ''}
		</div>
	{:else if stage === 'ready'}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">
			Pete’s ready. Press Hear Pete when you are: any music playing pauses while he talks, then carries on.
		</div>
		<button class="speak-btn dedication-play" onclick={hearPete}>▶ Hear Pete</button>
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
