<script lang="ts">
	import { CHARITY, TIP_URL } from './money';
</script>

<div class="money-buttons">
	{#if TIP_URL}
		<a class="money-btn" href={TIP_URL} rel="noopener" target="_blank">☕ Buy us a coffee</a>
	{:else}
		<span class="money-btn soon" title="Coming soon">☕ Buy us a coffee · coming soon</span>
	{/if}
	{#if CHARITY}
		<a class="money-btn charity" href={CHARITY.url} rel="noopener" target="_blank">♥ Give to {CHARITY.name}</a>
	{:else}
		<span class="money-btn charity soon" title="Coming soon">♥ Our charity · coming soon</span>
	{/if}
</div>
