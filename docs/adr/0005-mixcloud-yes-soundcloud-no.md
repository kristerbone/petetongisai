# Mixcloud yes, SoundCloud no

A Dedication's music can be a Spotify track or playlist or a single Mixcloud show, but not SoundCloud, even though SoundCloud is the bigger catalogue. Both services give an embeddable widget with a script API, like the Spotify embed (ADR 0001). We tested each on an iPhone (iOS 18.5, Safari): Mixcloud's widget can be started inside the listener's tap, paused for Pete, and resumed by the page afterwards, with no extra tap. SoundCloud's mobile embed shows only "Play on SoundCloud" and "Listen in browser" buttons that open the app, and raises an error event, so there is nothing to play or control inline. SoundCloud's developer API has also been closed to new apps since about 2017, so there is no track or playlist metadata to fall back on.

## Consequences

- A Dedication stores its music as one prefixed string (`spotify:…` or `mixcloud:/user/show/`) in `music`; older Dedications keep `spotifyUri` and are read as before.
- Only individual Mixcloud show links are accepted, not profiles, playlists or live streams.
- Track IDs stay Spotify-only: a show is one long mix with no track list to name. The Intro, the lamps and the Sign-off still work. A Mixcloud Dedication offers the playlist box straight after the Intro, because the Sign-off waits for the end of a show that can run for hours.
- If SoundCloud's embed changes, this can be revisited by adding a third embed behind `MusicPlayer` (`lib/music/`).
