<script lang="ts">
	import { speakAsPete, type PeteStatus } from './voice';

	const MAX_CHARS = 200;
	const PRESETS = {
		custom: { label: 'Custom text', text: '' },
		trackintro: {
			label: 'Introduce this track',
			text: 'Right, coming up next — introducing the next track as only Pete Tong can...'
		},
		rave: { label: 'Rave it up', text: 'COME ON! This place is absolutely on fire right now, are you ready?!' }
	};
	const STATUS: Record<PeteStatus, string> = {
		starting: 'Cueing Pete up…',
		warming: 'Warming up the decks… the first line after a quiet spell takes about a minute',
		playing: '',
		done: '',
		'off-air': 'Pete’s off air: this month’s hosting budget is used up. Back next month!',
		error: 'Pete couldn’t say that one. Try again in a moment.'
	};

	let text = $state('');
	let option = $state<keyof typeof PRESETS>('custom');
	let lastSpoken = $state('');
	let status = $state<PeteStatus | null>(null);
	let detail = $state('');
	const busy = $derived(status === 'starting' || status === 'warming');

	function select(key: keyof typeof PRESETS) {
		option = key;
		text = PRESETS[key].text;
	}

	async function speak() {
		const line = text.trim();
		if (!line || busy) return;
		lastSpoken = line.length > 80 ? line.slice(0, 80) + '…' : line;
		await speakAsPete(line, (s, d) => {
			status = s;
			detail = d ?? '';
		});
	}
</script>

<div class="pt-voice-section">
	<div class="section-label"><span class="led"></span>Pete Tong Voice — Speak as Pete</div>
	<div class="intro-badge">AI voice, not Pete Tong</div>
	<div class="voice-input-row">
		<input
			type="text"
			class="voice-input"
			placeholder="Type what Pete should say..."
			maxlength={MAX_CHARS}
			bind:value={text}
			onkeydown={(e) => e.key === 'Enter' && speak()}
		/>
		<button class="speak-btn" onclick={speak} disabled={busy}>{busy ? '…' : 'Speak It'}</button>
	</div>
	<div class="voice-options">
		<span class="section-label" style="margin:0;line-height:2.2;">Intro style:</span>
		{#each Object.entries(PRESETS) as [key, preset] (key)}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="voice-opt"
				class:selected={option === key}
				onclick={() => select(key as keyof typeof PRESETS)}
			>
				{preset.label}
			</div>
		{/each}
	</div>
	{#if lastSpoken}
		<div class="last-spoken" style:display="block">🎙 "{lastSpoken}"</div>
	{/if}
	{#if status && (detail || STATUS[status])}
		<div class="last-spoken voice-status" style:display="block" aria-live="polite">
			{detail || STATUS[status]}
		</div>
	{/if}
</div>
