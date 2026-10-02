<script lang="ts">
	import { onMount } from 'svelte';
	import JINGLES from './jingles.json';
	import { jingleSpeaking, pete } from './pete-audio';

	// Rendered once in Pete's voice by scripts/render-lines.mjs; served as static files
	let players: Record<string, HTMLAudioElement> = {};
	let current: HTMLAudioElement | null = null;
	let flashing = $state<string | null>(null);

	onMount(() => {
		players = Object.fromEntries(
			JINGLES.map((j) => {
				const audio = new Audio(`/jingles/${j.id}.mp3`);
				audio.preload = 'auto';
				// Only the Jingle that's playing now may end the pause; an interrupted one can still
				// fire 'ended' (or reject its play()) just after the next one starts
				audio.onended = () => audio === current && jingleSpeaking(false);
				return [j.id, audio];
			})
		);
	});

	function play(id: string) {
		if (pete.speaking) return;
		flashing = id;
		setTimeout(() => (flashing = null), 300);
		current?.pause();
		const audio = (current = players[id]);
		audio.currentTime = 0;
		jingleSpeaking(true);
		audio.play().catch(() => audio === current && jingleSpeaking(false));
	}
</script>

<div class="jingle-section">
	<div class="section-label">Pete Tong Jingle Buttons</div>
	<div class="jingle-grid">
		{#each JINGLES as jingle, i (jingle.id)}
			<button
				class="jingle-btn"
				class:col-b={i % 2 === 1}
				class:flash={flashing === jingle.id}
				title={jingle.text}
				onclick={() => play(jingle.id)}>{jingle.label}</button
			>
		{/each}
	</div>
</div>
