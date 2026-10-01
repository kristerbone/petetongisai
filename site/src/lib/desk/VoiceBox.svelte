<script lang="ts">
	import { speak } from './voice';

	const PRESETS = {
		custom: { label: 'Custom text', text: '' },
		trackintro: {
			label: 'Introduce this track',
			text: 'Right, coming up next — introducing the next track as only Pete Tong can...'
		},
		rave: { label: 'Rave it up', text: 'COME ON! This place is absolutely on fire right now, are you ready?!' }
	};

	let text = $state('');
	let option = $state<keyof typeof PRESETS>('custom');
	let lastSpoken = $state('');

	function select(key: keyof typeof PRESETS) {
		option = key;
		text = PRESETS[key].text;
	}

	function speakAsPete() {
		const line = text.trim();
		if (!line) return;
		speak(line);
		lastSpoken = line.length > 80 ? line.slice(0, 80) + '…' : line;
	}
</script>

<div class="pt-voice-section">
	<div class="section-label"><span class="led"></span>Pete Tong Voice — Speak as Pete</div>
	<div class="intro-badge">AI Voice — Browser TTS</div>
	<div class="voice-input-row">
		<input type="text" class="voice-input" placeholder="Type what Pete should say..." bind:value={text} />
		<button class="speak-btn" onclick={speakAsPete}>Speak It</button>
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
</div>
