# 12: Fade

**What to build:** A Dedication Fades when any visitor removes it or when nobody opens it for 30 days. See ADR 0003.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] "If this offended you, click here to remove it" on every Dedication page
- [ ] One click, no confirmation, deletes the record and the Intro audio at once
- [ ] The removed Intro stops being served everywhere, CDN copies included
- [ ] Removal requires a real click (a POST), so link-preview bots cannot trigger it
- [ ] Dedications not opened for 30 days (configurable) Fade automatically, with no manual maintenance
- [ ] A faded link shows "This Dedication has faded out. Send your own."
