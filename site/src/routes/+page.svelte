<script lang="ts">
	import Deck from '$lib/desk/Deck.svelte';
	import Jingles from '$lib/desk/Jingles.svelte';
	import PlayPanel from '$lib/desk/PlayPanel.svelte';
	import { pete } from '$lib/desk/pete-audio.svelte';
	import SiteFooter from '$lib/site/SiteFooter.svelte';
</script>

<svelte:head>
	<title>Pete Tong Is AI — Global Dance AI</title>
	<meta name="description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track or playlist, and send a friend a Dedication." />
	<meta property="og:title" content="Pete Tong Is AI — Global Dance AI" />
	<meta property="og:description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track or playlist, and send a friend a Dedication." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Pete Tong Is AI — Global Dance AI" />
	<meta name="twitter:description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track or playlist, and send a friend a Dedication." />
</svelte:head>

<div class="desk">
	<div class="desk-header">
		<h1>Pete Tong Is AI</h1>
		<p>Global Dance AI &bull; Nonstop &bull; Back to Back</p>
	</div>

	<div class="deck-strip">
		<Deck label="Deck A · Music" caption="MUSIC" spinning={pete.music} />
		<Deck label="Deck B · Pete" caption="PETE" spinning={pete.speaking || pete.jingle} />
	</div>

	<PlayPanel />
	<Jingles />

	<div class="status-bar">◉ PeteTongIsAI.com — Built with love ◉</div>
	<SiteFooter />
</div>
