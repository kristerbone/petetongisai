<script lang="ts">
	import MoneyButtons from './MoneyButtons.svelte';
	import { CHARITY } from './money';

	/** About shows the buttons in its own section, so it leaves them out here. */
	let { buttons = true }: { buttons?: boolean } = $props();
</script>

<!-- Dedication pages show this footer too, but without the money buttons (ticket 07) -->
<footer class="site-footer">
	{#if buttons}<MoneyButtons />{/if}
	<p class="disclaimer">
		Not affiliated with {CHARITY ? `Pete Tong, the BBC or ${CHARITY.name}` : 'Pete Tong or the BBC'}. All voices are
		AI-generated.
	</p>
	<nav class="footer-links"><a href="/">Desk</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a></nav>
</footer>
