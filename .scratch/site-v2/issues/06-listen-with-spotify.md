# 06: Listen with Spotify

**What to build:** A visitor pastes a Spotify track or playlist link into the desk panel, leaves Pete's text empty, presses Play, and it plays through the Spotify embed controlled by the iFrame API. Nothing is stored. See ADR 0001: no Web Playback SDK, and Pete never overlaps Spotify audio.

**Blocked by:** 04

**Status:** done on staging (built together with 10 as one Play panel)

- [x] Panel accepts a Spotify track or playlist link; invalid links are rejected clearly
- [x] Play with no text plays the embed; the embed shows its own cover art and metadata
- [x] The page can observe each track starting (for later Track IDs) and pause/resume the embed
- [x] The mocked Spotify player is removed; decks remain decorative

## Notes

- `site/src/lib/spotify/link.ts` parses track and playlist links (open.spotify.com, including /intl-xx/ and /embed/, and spotify: URIs); albums, artists and other sites are rejected, with tests.
- `site/src/lib/spotify/embed.ts` wraps the iFrame API. `onTrackStart(uri)` fires from `playback_started` with the actual track URI, including tracks inside a playlist; ticket 13 hooks in there. Deck A spins while the embed plays.
- `play()` after an Intro may be ignored by Safari without a fresh tap; the embed's own play button still works.
