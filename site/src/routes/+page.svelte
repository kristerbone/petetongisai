<script lang="ts">
	import Deck from '$lib/desk/Deck.svelte';
	import Jingles from '$lib/desk/Jingles.svelte';
	import Mixer from '$lib/desk/Mixer.svelte';
	import PlayPanel from '$lib/desk/PlayPanel.svelte';
</script>

<svelte:head>
	<title>Pete Tong Is AI — Global Dance AI</title>
</svelte:head>

<div class="desk">
	<div class="desk-header">
		<h1>Pete Tong Is AI</h1>
		<p>Global Dance AI &bull; Nonstop &bull; Back to Back</p>
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
