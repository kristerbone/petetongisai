# 12: Fade

**What to build:** A Dedication Fades when any visitor removes it or when nobody opens it for 30 days. See ADR 0003.

**Blocked by:** 11

**Status:** done on staging

- [x] "If this offended you, click here to remove it" on every Dedication page
- [x] One click, no confirmation, deletes the record and the Intro audio at once
- [x] The removed Intro stops being served everywhere, CDN copies included
- [x] Removal requires a real click (a POST), so link-preview bots cannot trigger it
- [x] Dedications not opened for 30 days (configurable) Fade automatically, with no manual maintenance
- [x] A faded link shows "This Dedication has faded out. Send your own."

## Notes

- Remove is a SvelteKit form action (`/d/<id>?/remove`): a real POST, refused cross-site by SvelteKit's origin check (403), then a 303 back to the plain link, now faded. It deletes the record and `dedications/<id>.wav` together.
- Intro audio is served `private, no-store`, so neither CloudFront nor browsers keep a copy; a removed Intro 404s at once.
- 30-day Fade: each record has a DynamoDB TTL `fadesAt`, set to 30 days after creation and pushed back on every open. The period is `FADE_AFTER_DAYS` in `site/sst.config.ts`. DynamoDB's TTL sweep can lag by a day or two, so records past `fadesAt` are already treated as gone on read.
- Audio never outlives its record: the table stream (old images, REMOVE events) runs `site/functions/fader.ts`, which deletes the audio. On staging it was gone about 2s after the record.
- `intro#<render id>` claims are kept after a removal (they expire after a day), so the sender can't re-send a removed Intro: Send returns 410 "That Dedication was removed".
- Tested on staging: preview-bot GETs change nothing; cross-site POST 403; remove deletes record, audio and serving at once; re-send refused; an expired record shows the faded message; record deletion cleans up its audio through the stream.
