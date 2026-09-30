# 06: Listen with Spotify

**What to build:** A visitor pastes a Spotify track or playlist link into the desk panel, leaves Pete's text empty, presses Play, and it plays through the Spotify embed controlled by the iFrame API. Nothing is stored. See ADR 0001: no Web Playback SDK, and Pete never overlaps Spotify audio.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Panel accepts a Spotify track or playlist link; invalid links are rejected clearly
- [ ] Play with no text plays the embed; the embed shows its own cover art and metadata
- [ ] The page can observe each track starting (for later Track IDs) and pause/resume the embed
- [ ] The mocked Spotify player is removed; decks remain decorative
