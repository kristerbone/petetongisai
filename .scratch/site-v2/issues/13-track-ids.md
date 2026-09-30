# 13: Track IDs

**What to build:** While music plays, Pete back-announces the last two tracks every two tracks: the embed pauses, Pete speaks, the music resumes. Works when just listening and on Dedication pages.

**Blocked by:** 03, 06, 08

**Status:** ready-for-agent

- [ ] Every second track start, the embed pauses, the Track ID plays, then playback resumes
- [ ] A single-track play gets one Track ID at the end
- [ ] Track names come from the track's ISRC (via Spotify's app-only track lookup) matched in MusicBrainz; Spotify's own title is never passed to the voice model
- [ ] No MusicBrainz match gives a generic line instead
- [ ] Each track's line is rendered once while it plays and cached for everyone; joining phrases are pre-rendered
- [ ] When the spending cap is hit, generic lines are used until it resets and music keeps playing
