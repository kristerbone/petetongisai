<script lang="ts">
	import Knob from './Knob.svelte';
	import LevelMeter from './LevelMeter.svelte';
	import { decks } from './state.svelte';
</script>

<div class="mixer-center">
	<div class="crossfader-section">
		<div class="section-label">Crossfader</div>
		<input type="range" class="crossfader" min="0" max="100" value="50" />
		<div class="crossfader-labels"><span>A</span><span>B</span></div>
	</div>
	<div class="eq-section">
		<div class="section-label">EQ</div>
		<div class="eq-row">
			<Knob label="HI" />
			<Knob label="MID" />
			<Knob label="LO" />
		</div>
	</div>
	<div class="master-section">
		<div class="section-label">Master</div>
		<LevelMeter id="meterMaster" bars={8} height={36} active={decks.A.playing || decks.B.playing} />
		<div class="bpm-display master-vol">0 dB</div>
	</div>
</div>
