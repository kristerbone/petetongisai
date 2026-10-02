# 09: Original Jingles

**What to build:** The approved original Jingles are rendered once in Pete's voice and served as static audio from the desk's Jingle buttons. No per-press rendering cost.

**Blocked by:** 03, 08

**Status:** done on staging

- [x] Every approved Jingle rendered once and stored as a static audio file
- [x] Each Jingle button plays its file instantly
- [x] No BBC, Radio 1 or Essential Mix references remain anywhere on the desk

## Notes

- `site/src/lib/desk/jingles.json` is the source of truth: id, button label, display text, and an optional `spoken` text so "AI"/"HQ" are said as letters. `node site/scripts/render-jingles.mjs` renders any missing Jingle through voice-service (retrying with the next Reference Clip if the dropped-words check fails), evens out loudness, and writes a 96 kbps mono MP3 to `site/static/jingles/` (`--force` re-renders all). All 8 passed on the first take; about 390 KB together.
- Served as static assets, preloaded on page load, so a press costs nothing. `sst.config.ts` sets `audio/mpeg` for them: SST's type lookup doesn't know .mp3, and Safari won't play audio served as octet-stream.
- Pete never talks over the music: a Jingle pauses the Spotify embed and resumes it when it ends (`lib/desk/pete-audio.ts`), and Jingles are ignored while an Intro plays. The embed ignores `pause()` while a track is still starting, so a Jingle's pause is held and re-sent until resume.
- Browser text-to-speech is gone from the site. The header now reads "Global Dance AI • Nonstop • Back to Back", and the page title "Pete Tong Is AI — Global Dance AI".
