<script lang="ts">
	import { CHARITY, TIP_URL } from './money';
</script>

<!-- Desk, About and Privacy only: Dedication pages carry no money buttons (ticket 07) -->
<footer class="site-footer">
	{#if TIP_URL || CHARITY}
		<div class="money-buttons">
			{#if TIP_URL}<a class="money-btn" href={TIP_URL} rel="noopener" target="_blank">☕ Tip the hosting costs</a>{/if}
			{#if CHARITY}<a class="money-btn charity" href={CHARITY.url} rel="noopener" target="_blank">♥ Give to {CHARITY.name}</a>{/if}
		</div>
	{/if}
	<p class="disclaimer">
		Not affiliated with {CHARITY ? `Pete Tong, the BBC or ${CHARITY.name}` : 'Pete Tong or the BBC'}. All voices are
		AI-generated.
	</p>
	<nav class="footer-links"><a href="/">Desk</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a></nav>
</footer>
