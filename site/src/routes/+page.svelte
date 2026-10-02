<script lang="ts">
	import { onMount } from 'svelte';
	import Deck from '$lib/desk/Deck.svelte';
	import Jingles from '$lib/desk/Jingles.svelte';
	import Mixer from '$lib/desk/Mixer.svelte';
	import PlayPanel from '$lib/desk/PlayPanel.svelte';
	import { warmUpVoices } from '$lib/desk/voice';

	onMount(warmUpVoices);
</script>

<svelte:head>
	<title>Pete Tong Is AI — The Essential Mix</title>
</svelte:head>

<div class="desk">
	<div class="desk-header">
		<h1>Pete Tong Is AI</h1>
		<p>The Essential Mix &bull; BBC Radio 1 &bull; Ibiza</p>
	</div>

	<div class="main-grid">
		<Deck id="A" />
		<Mixer />
		<Deck id="B" />
	</div>

	<Jingles />
	<PlayPanel />

	<div class="status-bar">◉ PeteTongIsAI.com — Built with love ◉</div>
</div>
