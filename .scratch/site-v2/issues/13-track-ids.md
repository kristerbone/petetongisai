# 13: Track IDs

**What to build:** While music plays, Pete back-announces the last two tracks every two tracks: the embed pauses, Pete speaks, the music resumes. Works when just listening and on Dedication pages.

**Blocked by:** 03, 06, 08

**Status:** done on staging

- [x] Every second track start, the embed pauses, the Track ID plays, then playback resumes
- [x] A single-track play gets one Track ID at the end
- [x] Track names come from the track's ISRC (via Spotify's app-only track lookup) matched in MusicBrainz, or Deezer when MusicBrainz has no match; Spotify's own title is never passed to the voice model
- [x] No match in either gives a generic line instead
- [x] Each track's line is rendered once while it plays and cached for everyone; joining phrases are pre-rendered
- [x] When the spending cap is hit, generic lines are used until it resets and music keeps playing

## Notes

- Pausing, playing and resuming, plus the end-of-music Track ID, were checked headless against the real embed with the generic lines. On staging, the server path worked end to end: "One More Time" got the ISRC from Spotify, then "Daft Punk / One More Time" from MusicBrainz, and rendered "That's One More Time from Daft Punk." in about 66s from a cold GPU. After that it comes from the cache in about 0.4s. An unknown track gets 204 `no-match`. The SST Secrets `SpotifyClientId` and `SpotifyClientSecret` are set on staging and production.
- How the embed behaves (headless Chrome, signed out): `playback_started` fires once per track and not on resume. Previews are now 15 to 30 seconds long. When the music runs out, the embed sends no event: updates just stop at the end of the track. `embed.ts` treats "position at the end, then no update for 2.5s" (or paused at the end) as ended.
- Spotify's own editorial playlists (`37i9…`) didn't load in the embed for a signed-out visitor; user playlists did. They also 404 on the app-only API, but Track IDs only look up tracks.
- Each track is named once per session, as the newest track ("lead"), as the older one ("follow"), or as "first" when it opened the session. Its template is picked by hashing the track id, so there are at most three renders per track, ever. A playlist ending on an odd track renders that track's lead line then, after the music has stopped.
- At a track start, Pete waits up to 8s for a line, then says a generic one. With a cold GPU (~60s) and short previews, the first Track ID of a session will often be generic.
- New renders count against a per-IP limit of 60 an hour (cached lines are free). Past it, Pete says generic lines.
- Titles lose "(Original Mix)", "(Radio Edit)" and remaster tags; a name over 90 characters gets a generic line. Track names aren't run through the Haiku check that Intros get.
- The 25 pre-rendered pieces are in `static/track-ids/`, rendered by `scripts/render-lines.mjs` (which used to be `render-jingles.mjs`). All passed the dropped-words check; "That one's a mystery… even to me" took a third Reference Clip (coverage 0.83), so listen to it.

### Signed-in listeners (found in owner testing, 2026-10-02)

- A signed-in listener's embed (full tracks) reports only the **playlist** URI, fires `playback_started` once, and shows a new track only as a new duration with the position back at 0. `embed.ts` now spots track starts from updates: a new URI, or a duration that changes by 1.5s or more.
- The Web API won't list a playlist's tracks with an app-only token (403, even for public playlists). So `/api/playlist/[id]` reads the track ids and durations from Spotify's public embed page (`open.spotify.com/embed/playlist/…`, `__NEXT_DATA__`). The owner chose this knowing it's unofficial: if the page changes, it returns 502 and Pete says generic lines. The player matches each track change to the next unplayed track of that duration (within 1s), and falls back to any unplayed match (shuffle). Two tracks with near-identical lengths in a row could be swapped.
- MusicBrainz had no ISRC for about half of an older reggae/ska playlist. Deezer's public ISRC lookup (no key) found 9 of 9 of those misses, so the owner chose MusicBrainz first, then Deezer. **Deezer's terms ask for attribution: ticket 07's About page should credit MusicBrainz and Deezer.**
- An artist credit too long to say falls back to its first artist ("House of Pain" for a five-artist "Jump Around").
- Verified by the owner signed in on Chrome: track changes were matched correctly and the Track ID played at track 3.
