<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:head>
	<meta property="og:site_name" content="Pete Tong Is AI" />
	<meta property="og:locale" content="en_GB" />
	{#if !page.url.pathname.startsWith('/d/')}
		<link rel="canonical" href="https://petetongisai.com{page.url.pathname === '/' ? '/' : page.url.pathname.replace(/\/$/, '')}" />
		<meta property="og:url" content="https://petetongisai.com{page.url.pathname}" />
	{/if}
</svelte:head>

{@render children()}
