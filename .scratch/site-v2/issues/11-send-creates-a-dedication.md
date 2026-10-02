# 11: Send creates a Dedication

**What to build:** After Play, Send turns the Intro into a Dedication with a unique link, without rendering again. Opening the link shows the Dedication page: one tap plays the Intro, then the music.

**Blocked by:** 10

**Status:** done on staging

- [x] Send stores the Dedication (Intro audio plus optional Spotify link) and returns a unique, unguessable link
- [x] Send requires Intro text; nothing is stored for Play alone
- [x] The Dedication page plays the Intro on tap, then the music
- [x] The page carries the "AI voice, not Pete Tong" label and is marked noindex
- [x] Link previews in messaging apps show "Someone sent you a Dedication", with no message text or track title
- [x] Opening the page records the time it was last opened (for Fade)

## Notes

- `POST /api/dedications {introId, spotifyUri?}` copies the held Intro in S3 (`intros/<render id>.wav` → `dedications/<id>.wav`); nothing is rendered again. It needs an Intro held within the last hour (410 otherwise), so Play alone never stores anything.
- IDs are 128 random bits (22 base64url characters). A claim item `intro#<render id>` in the `Dedications` table means each Intro becomes at most one Dedication; sending it again returns the same link.
- `/d/<id>`: `X-Robots-Tag` and `<meta name="robots">` noindex, `Cache-Control: private, no-store`, and Open Graph/Twitter tags reading only "Someone sent you a Dedication"; neither the Intro text nor the track title is on the page. One tap plays `/d/<id>/intro.wav` (60s cache, for Fade), then the embed. Unknown or removed IDs show "This Dedication has faded out. Send your own."
- `lastOpenedAt` is updated on every page load, including link-preview bots fetching it. Ticket 12 builds the 30-day Fade on it.
- The desk's note "It fades if nobody opens it for 30 days" is only true once ticket 12 is built.
