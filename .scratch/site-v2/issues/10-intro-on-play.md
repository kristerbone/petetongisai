# 10: Intro on Play

**What to build:** A visitor types what Pete should say, optionally adds a Spotify link, and presses Play: the text is checked, Pete's Intro is rendered and plays, then the music starts. Voice-only (no link) works too.

**Blocked by:** 06, 08

**Status:** ready-for-agent

- [ ] Intro text capped at 200 characters
- [ ] Claude Haiku checks the text before rendering; rejected text gets only "Pete's not saying that one" and still counts toward the rate limit
- [ ] Play with text is limited to 5 per hour per IP
- [ ] A "warming up the decks" state covers the render wait
- [ ] The Intro plays fully, then the embed starts; Pete never overlaps Spotify audio
- [ ] The rendered Intro is held server-side for up to an hour so Send can reuse it (never uploaded from the browser)
