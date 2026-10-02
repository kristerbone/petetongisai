# 14: Sign-off and playlist box

**What to build:** Every Dedication ends with Pete's Sign-off inviting the listener to hand over a playlist, then a playlist box that loads into the desk panel for listening with Track IDs or sending their own Dedication.

**Blocked by:** 03, 08, 11

**Status:** done on staging

- [x] Sign-off variants are pre-rendered once, not per play
- [x] A voice-only Dedication plays the Sign-off after the Intro; one with music plays it after the final Track ID
- [x] A playlist box appears after the Sign-off; submitting it opens the desk panel with the link filled in

## Notes

- The four Sign-offs are in `site/src/lib/dedication/sign-offs.json`, rendered by `scripts/render-lines.mjs` into `static/sign-offs/`. They're long, so they needed retries: 1 passed on ref3, 2 on ref2 (coverage 0.99), 3 and 4 on ref4 (4 at 0.95). Worth a listen.
- Rotation: each browser keeps the last one played in localStorage and plays the next; with storage blocked, it picks at random.
- The Sign-off plays through the Track ID player's Web Audio context, unlocked by the Play tap, so Safari lets it play minutes later without a fresh tap. With music, it plays when the embed reports the end, after the final Track ID. If the listener leaves mid-playlist, there's no Sign-off.
- The box accepts a playlist or a track link and opens `/?link=…#play`. The Play panel fills in the link and focuses Play; the browser needs a tap to start audio, so it doesn't autoplay.
- Tested headless on staging with two throwaway Dedications (since removed): voice-only gives Intro → Sign-off → box; with a track it's Intro → track → Track ID (the real cached line) → Sign-off → box.
