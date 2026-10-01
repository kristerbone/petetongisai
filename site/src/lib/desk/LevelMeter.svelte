<script lang="ts">
	let { id, bars, height, active }: { id: string; bars: number; height: number; active: boolean } =
		$props();

	// svelte-ignore state_referenced_locally
	let levels = $state(Array(bars).fill(0));

	$effect(() => {
		const timer = setInterval(() => {
			levels = levels.map(() => (active ? Math.random() * 72 + 20 : Math.random() * 4));
		}, 110);
		return () => clearInterval(timer);
	});

	const colour = (pct: number) => (pct > 80 ? '#ff3333' : pct > 60 ? '#ffaa00' : '#1db954');
</script>

<div class="level-meter" {id}>
	{#each levels as pct, i (i)}
		<div class="meter-bar" style:height="{height}px">
			<div class="meter-fill" style:height="{pct}%" style:background={colour(pct)}></div>
		</div>
	{/each}
</div>
