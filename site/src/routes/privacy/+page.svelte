<script lang="ts">
	import SiteFooter from '$lib/site/SiteFooter.svelte';
</script>

<svelte:head>
	<title>Privacy — Pete Tong Is AI</title>
	<meta name="description" content="What Pete Tong Is AI stores, for how long, and who can see it." />
</svelte:head>

<!-- Keep in step with the code: rate-limit*.ts, intros.ts, dedications.ts, track-ids.ts, sst.config.ts -->
<div class="desk page">
	<div class="desk-header">
		<h1>Privacy</h1>
		<p>Pete Tong Is AI</p>
	</div>

	<div class="page-body">
		<p>
			This site has no accounts, no ads, no analytics and sets no cookies of its own. It keeps as little as it can,
			for as short a time as it can. Here's all of it.
		</p>

		<h2>Your IP address, for rate limiting</h2>
		<p>
			When you press Play with text, the site records the time against your IP address (for IPv6, your network's
			prefix), so each address gets a limited number of Intros an hour. New Track ID lines are counted the same way.
			These records delete themselves after an hour. They aren't used for anything else.
		</p>

		<h2>What you type, and Pete's Intro</h2>
		<p>
			The text you give Pete is sent to Anthropic's Claude to check it's OK for him to say, then to the site's voice
			service on Modal to make the audio. The site doesn't store your text, though the voice service's logs record
			it while checking each take, and Modal keeps those logs for a limited time. The audio is held so you can Send
			it, and deleted within a day if you don't. Anthropic and Modal may process it outside the UK.
		</p>

		<h2>What a Dedication stores</h2>
		<p>
			When you Send, the site stores the Intro's audio, the Spotify or Mixcloud link (if you added one), and when the Dedication
			was created and last opened. Not who sent it or who it's for, beyond whatever you said in the Intro. Anyone
			with the link can hear it, and anyone who opens it can remove it at once, deleting the record and the audio.
		</p>
		<p>
			A Dedication nobody opens for 30 days Fades: its record and audio are deleted automatically. Every time someone
			opens it, the 30 days start again.
		</p>

		<h2>Music and Track IDs</h2>
		<p>
			Music plays in Spotify's embedded player, which Spotify runs under
			<a href="https://www.spotify.com/legal/privacy-policy/" rel="noopener">its own privacy policy</a> and which may
			set Spotify's cookies. To name tracks, your browser sends the Spotify ID of the track (or playlist) to the
			site's server, which looks it up with Spotify, MusicBrainz and Deezer. Each track's line is stored and shared with
			everyone who plays that track, with nothing about who played it.
		</p>
		<p>
			A Mixcloud show plays in Mixcloud's embedded player instead, under
			<a href="https://www.mixcloud.com/privacy/" rel="noopener">its own privacy policy</a>, and may set Mixcloud's
			cookies. A show has no Track IDs, so nothing about it is sent to the site's server beyond the link you send.
		</p>

		<h2>In your browser</h2>
		<p>The site remembers which Sign-off you heard last, in your browser's storage, so you hear a different one next time. It never leaves your device.</p>

		<h2>Logs and hosting</h2>
		<p>
			The site runs on Amazon Web Services in London. Its error logs are kept for a month and don't include IP
			addresses.
		</p>

		<h2>Questions</h2>
		<p>
			<a href="https://github.com/kristerbone/petetongisai/issues" rel="noopener">Open an issue on GitHub</a>, where
			the site's code is public too. Please don't put personal details in an issue: they're public. See also:
			<a href="/about">About</a>.
		</p>
	</div>

	<SiteFooter />
</div>
