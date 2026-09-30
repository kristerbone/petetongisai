# 11: Send creates a Dedication

**What to build:** After Play, Send turns the Intro into a Dedication with a unique link, without rendering again. Opening the link shows the Dedication page: one tap plays the Intro, then the music.

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Send stores the Dedication (Intro audio plus optional Spotify link) and returns a unique, unguessable link
- [ ] Send requires Intro text; nothing is stored for Play alone
- [ ] The Dedication page plays the Intro on tap, then the music
- [ ] The page carries the "AI voice, not Pete Tong" label and is marked noindex
- [ ] Link previews in messaging apps show "Someone sent you a Dedication", with no message text or track title
- [ ] Opening the page records the time it was last opened (for Fade)
