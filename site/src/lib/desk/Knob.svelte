<script lang="ts">
	let { label }: { label: string } = $props();

	// Unturned knobs keep the stylesheet's look; the first click lands at 210°
	let rotation = $state<number | null>(null);
</script>

<div class="knob-wrap">
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="knob"
		style:background={rotation === null
			? undefined
			: `conic-gradient(#ff6b35 0deg ${rotation}deg, #2a2a2a ${rotation}deg)`}
		onclick={() => (rotation = ((rotation ?? 180) + 30) % 360)}
	></div>
	<div class="knob-label">{label}</div>
</div>
