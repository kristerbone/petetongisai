# 17: The desk fits on a phone

**What to build:** On a phone the desk page scrolls sideways: at 375px wide the page is 565px. The cause is the decks-and-mixer grid from the v1 stylesheet: `.main-grid` is always three columns (`1fr 180px 1fr`) with 130px platters, and the stylesheet had no phone layout. Make the desk fit any screen down to 320px without sideways scrolling, keeping both decks and the mixer.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] No sideways page scroll on the desk at 320px, 375px or 414px (only the occasion chips' own strip scrolls, as designed in ticket 16)
- [ ] Under 600px: Deck A and Deck B side by side, with smaller platters (about 100px), and the mixer (crossfader and EQ) full width below them
- [ ] Nothing else changes on desktop
- [ ] The Jingles grid, Play panel, footer, About, Privacy and Dedication pages also checked at 320px
- [ ] Checked headless at each width: `document.documentElement.scrollWidth` is at most the window width, plus a screenshot

## Notes

- Found while building ticket 16 (2026-10-02). At 375px, `.mixer-center`, `.crossfader-section` and `.eq-section` all reach 393px, past the screen's edge. About and Privacy already fit.
- The decks are decorative (ADR 0001), so smaller platters lose nothing. Their spin and the BPM display just need to stay legible.
- Relevant CSS in `site/src/app.css`: `.main-grid` (around line 54), `.platter` (130px), `.mixer-center` (around line 265), and the existing `@media (max-width: 600px)` block from ticket 16 at the end of the file.
