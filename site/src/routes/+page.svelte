<script lang="ts">
	import Lamps from '$lib/desk/Lamps.svelte';
	import Jingles from '$lib/desk/Jingles.svelte';
	import PlayPanel from '$lib/desk/PlayPanel.svelte';
	import SiteFooter from '$lib/site/SiteFooter.svelte';
</script>

<svelte:head>
	<title>Pete Tong Is AI — Global Dance AI</title>
	<meta name="description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track, playlist or Mixcloud show, and send a friend a Dedication." />
	<meta property="og:title" content="Pete Tong Is AI — Global Dance AI" />
	<meta property="og:description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track, playlist or Mixcloud show, and send a friend a Dedication." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Pete Tong Is AI — Global Dance AI" />
	<meta name="twitter:description" content="A fan-made DJ desk with an AI Pete Tong: fire off jingles, have Pete introduce your Spotify track, playlist or Mixcloud show, and send a friend a Dedication." />
</svelte:head>

<div class="desk">
	<div class="desk-header">
		<h1>Pete Tong Is AI</h1>
		<p>Global Dance AI &bull; Nonstop &bull; Back to Back</p>
	</div>

	<Lamps />

	<PlayPanel />
	<Jingles />

	<div class="status-bar">◉ PeteTongIsAI.com — Built with love ◉</div>
	<SiteFooter />
</div>
