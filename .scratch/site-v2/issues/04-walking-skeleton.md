# 04: Walking skeleton: SvelteKit on AWS

**What to build:** The current desk (decks, meters, EQ knobs, Jingle buttons, voice box) running as a SvelteKit app deployed to AWS with SST at a real URL. Behaviour is unchanged: browser text-to-speech still speaks. This is the prefactor every later ticket builds on.

**Blocked by:** 01

**Status:** done: production is live at https://petetongisai.com (2026-10-02)

- [x] SvelteKit project deployed via SST to AWS; a single command deploys it
- [x] The desk looks and behaves as the current static site does
- [x] Served on the confirmed domain (or a staging subdomain) over HTTPS
- [x] The old static files and ElevenLabs/Spotify-SDK stubs are removed or retired

## Notes

- The app is in `site/`: SvelteKit 2.70 (not 3.0, which came out 2026-10-01; SST's adapter predates it) on Node 24.
- Staging: https://d11ahsaa96rwv9.cloudfront.net (`npm run deploy:staging`). Screenshots match v1, and every control was checked in headless Chrome.
- SST can't read `aws login` sessions, so `site/scripts/with-aws.sh` exports short-lived keys for it.
- Once `dig +short NS petetongisai.com` shows the awsdns servers, run `npm run deploy` (production stage, domain plus a www redirect, with an ACM certificate through Route 53).

- Production deployed 2026-10-02: https://petetongisai.com, with an ACM certificate valid to April 2027 and `www` redirecting to the apex. Checked over HTTPS: every page, the favicon, Jingles and Sign-offs, the playlist API, and a full Track ID render (Spotify, MusicBrainz, Modal). Production has its own tables and buckets, separate from staging, and keeps the public IP limits (5 Plays, 60 new Track ID lines an hour).
