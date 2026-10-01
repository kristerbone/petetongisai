<script lang="ts">
	import LevelMeter from './LevelMeter.svelte';
	import { decks, type DeckId } from './state.svelte';

	let { id }: { id: DeckId } = $props();
	const deck = $derived(decks[id]);

	function nudge(delta: number) {
		deck.bpm = Math.max(60, Math.min(200, deck.bpm + delta));
	}
</script>

<div class="turntable">
	<div class="section-label">Deck {id}</div>
	<div class="platter-wrap">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class="platter"
			class:spinning={deck.playing}
			style:animation-duration={deck.playing ? `${60 / deck.bpm}s` : undefined}
			onclick={() => (deck.playing = !deck.playing)}
		>
			<div class="platter-grooves"></div>
			<div class="platter-label" style:font-size={deck.playing ? '9px' : '8px'}>
				{#if deck.playing}▶ LIVE{:else}PRESS<br />PLAY{/if}
			</div>
		</div>
	</div>
	<div class="tt-track-label">{deck.track}</div>
	<div class="fader-section">
		<div class="fader-col">
			<div class="fader-track"><div class="fader-thumb"></div></div>
			<div class="fader-label">VOL</div>
		</div>
		<div class="fader-col">
			<LevelMeter id="meter{id}" bars={12} height={60} active={deck.playing} />
			<div class="fader-label">LVL</div>
		</div>
	</div>
	<div class="bpm-display">{deck.bpm.toFixed(1)}</div>
	<div class="bpm-label">BPM</div>
	<div class="tt-controls">
		<button class="tt-btn" onclick={() => nudge(-0.1)}>— 0.1</button>
		<button class="tt-btn" onclick={() => nudge(0.1)}>+ 0.1</button>
	</div>
</div>
