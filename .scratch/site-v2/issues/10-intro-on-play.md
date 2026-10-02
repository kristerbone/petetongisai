# 10: Intro on Play

**What to build:** A visitor types what Pete should say, optionally adds a Spotify link, and presses Play: the text is checked, Pete's Intro is rendered and plays, then the music starts. Voice-only (no link) works too.

**Blocked by:** 06, 08

**Status:** done on staging

- [x] Intro text capped at 200 characters
- [x] Claude Haiku checks the text before rendering; rejected text gets only "Pete's not saying that one" and still counts toward the rate limit
- [x] Play with text is limited to 5 per hour per IP
- [x] A "warming up the decks" state covers the render wait
- [x] The Intro plays fully, then the embed starts; Pete never overlaps Spotify audio
- [x] The rendered Intro is held server-side for up to an hour so Send can reuse it (never uploaded from the browser)

## Notes

- One Play panel replaces the old "Speak It" box and the mock Spotify player, so all free text goes through the check and the limit. `/api/speak` is gone; `/api/intro` replaces it.
- Rate limit: a sliding one-hour window in DynamoDB (`RateLimits`), keyed by `CloudFront-Viewer-Address`. `X-Forwarded-For` reaches the Lambda exactly as the client sent it, so it was spoofable. IPv6 is keyed per /64. The hit is counted before the Haiku check.
- Haiku check (`site/src/lib/server/intro-check.ts`): `claude-haiku-4-5` with structured output `{allowed}`, failing closed (503) if the check errors. On staging it rejected a scam, a political endorsement, a defamatory claim and a prompt injection, and allowed 10 of 10 ordinary dedications.
- Intros are held in the S3 bucket `Intros` (`intros/<render id>.wav`), trusted for an hour and deleted after a day; ticket 11 reuses them by render id.
- Served as `audio/x-wav`: svelte-kit-sst's binary type list has a typo ("audio/wavaudio/webm"), so `audio/wav` bodies were corrupted as UTF-8 text. Worth reporting upstream.
- Jingles still use browser text-to-speech (ticket 09).
