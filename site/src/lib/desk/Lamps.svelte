<script lang="ts">
	import { pete } from './pete-audio.svelte';

	/** On Air while Pete speaks (an Intro, Track ID, Sign-off or Jingle); Tunes while the embed plays. */
	const onAir = $derived(pete.speaking || pete.jingle);
</script>

<div class="lamps" role="status" aria-live="polite">
	<div class="lamp lamp-onair" class:lit={onAir}>
		<span class="lamp-light" aria-hidden="true"></span>
		<span class="lamp-name">On Air</span>
		<span class="lamp-state">{onAir ? 'Pete’s talking' : 'Off'}</span>
	</div>
	<div class="lamp lamp-tunes" class:lit={pete.music}>
		<span class="lamp-light" aria-hidden="true"></span>
		<span class="lamp-name">Tunes</span>
		<span class="lamp-state">{pete.music ? 'Playing' : 'Off'}</span>
	</div>
</div>
