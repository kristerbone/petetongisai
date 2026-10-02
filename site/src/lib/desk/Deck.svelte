<script lang="ts">
	// Decorative (ADR 0001: the embed plays the music, so nothing here controls the sound)
	let { label, caption, spinning }: { label: string; caption: string; spinning: boolean } = $props();
</script>

<div class="turntable">
	<div class="section-label">{label}</div>
	<div class="platter-wrap">
		<div class="platter" class:spinning aria-hidden="true">
			<div class="platter-grooves"></div>
			<div class="platter-label">{spinning ? '▶ LIVE' : caption}</div>
		</div>
	</div>
</div>
