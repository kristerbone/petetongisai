<script lang="ts">
	import { speak } from './voice';

	const JINGLES = [
		{ label: 'Essential Mix', side: 'a', text: "Welcome to the Essential Mix. Two hours of the finest music on the planet, right here on BBC Radio One. Let's go." },
		{ label: 'This is Pete Tong', side: 'a', text: 'My name is Pete Tong. And this… is my show.' },
		{ label: "It's All Gone Pete Tong", side: 'b', text: 'It has, quite literally, all gone Pete Tong.' },
		{ label: 'Ibiza!', side: 'b', text: "Ibiza! The white isle. There's nowhere like it on earth. Absolute paradise." },
		{ label: 'BBC Radio One', side: 'a', text: "You're listening to BBC Radio One. I'm Pete Tong. Stay with me." },
		{ label: 'This is Massive', side: 'a', text: 'This is absolutely massive. Huge. One of the biggest tunes of the year, right here.' },
		{ label: 'What a Feeling', side: 'b', text: "What. A. Feeling. This is what it's all about. Right here, right now." },
		{ label: 'Big Error', side: 'b', text: 'Now that… that was a big error. But we move on. The music never stops.' }
	];

	let flashing = $state<string | null>(null);

	function play(jingle: (typeof JINGLES)[number]) {
		flashing = jingle.label;
		setTimeout(() => (flashing = null), 300);
		speak(jingle.text);
	}
</script>

<div class="jingle-section">
	<div class="section-label">Pete Tong Jingle Buttons</div>
	<div class="jingle-grid">
		{#each JINGLES as jingle (jingle.label)}
			<button
				class="jingle-btn"
				class:col-b={jingle.side === 'b'}
				class:flash={flashing === jingle.label}
				onclick={() => play(jingle)}>{jingle.label}</button
			>
		{/each}
	</div>
</div>
