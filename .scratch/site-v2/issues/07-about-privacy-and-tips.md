# 07: About and Privacy pages, tips

**What to build:** About and Privacy pages, plus the money buttons and disclosure in the desk footer and on About. Never on Dedication pages.

**Blocked by:** 04, 05

**Status:** in progress: pages and footer done on staging; the tip and charity buttons wait for their links (`site/src/lib/site/money.ts`)

- [x] About page: fan tribute, "Built for fun, not money", AI voice disclosure
- [x] Privacy page covers rate limiting by IP, what a Dedication stores, and the 30-day inactivity Fade
- [x] "Buy us a coffee" button links to Buy Me a Coffee (a plain link, no embedded widget or cookies); changed from Ko-fi by the owner, 2026-10-02
- [ ] Charity button links to the charity's official fundraising page
- [x] Footer: "Not affiliated with Pete Tong, the BBC or [charity]. All voices are AI-generated."
- [x] No money buttons on Dedication pages

## Notes

- From ticket 13: Track ID names come from MusicBrainz and Deezer (looked up by ISRC). Deezer's API terms ask for attribution, so credit both on the About page.
- `/about` and `/privacy` are prerendered. The footer (`lib/site/SiteFooter.svelte`) appears on the desk, About and Privacy, and never on Dedication pages. About credits MusicBrainz, Deezer, Spotify's embed and Chatterbox.
- The money buttons (`lib/site/MoneyButtons.svelte`) read `TIP_URL` and `CHARITY` from `lib/site/money.ts`. While a value is null, its button shows as a dimmed "coming soon" placeholder. They appear in the footer and in About's "Built for fun, not money" section, and the footer says "Pete Tong or the BBC" until a charity is named. The Buy Me a Coffee link is set (https://www.buymeacoffee.com/petetongisai, 2026-10-02). Still needed: ticket 05's charity name and fundraising link.
- About's copy is the owner's brief: the real Pete Tong is not AI (listened since 18 in the early '90s; the don, the master, the legend), an open offer to special-guest his shows and to dog-sit, and a call for joyful, inclusive, peaceful use.
- Privacy describes what the code does today. If any of these change, update the page: the rate-limit window (1 hour), held Intros (deleted within a day), the Fade (30 days, `FADE_AFTER_DAYS`), log retention (SST's default of 1 month), or what voice-service logs (it prints each sentence's text while checking takes).
- Contact is via issues on the public GitHub repo (ADR 0003, updated), which About also links as "how it's made". About invites Pete Tong or his representatives to get in touch that way, without promising a takedown. Voice-service logs stay as they are (Modal's own retention; input is sanitised before sending).
