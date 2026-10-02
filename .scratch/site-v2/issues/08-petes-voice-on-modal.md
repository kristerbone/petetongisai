# 08: Pete's voice on Modal

**What to build:** The winning voice model from the listening test runs on Modal, and the site can turn a line of text into Pete's voice. The desk's voice box uses it in place of browser text-to-speech. See ADR 0004.

**Blocked by:** 01, 02, 04

**Status:** done on staging; production gets the same once 04 deploys to the domain (its SST secrets are already set)

- [x] The model runs on a Modal GPU, scaling to zero when idle, using the chosen Reference Clip or fine-tuned weights
- [x] Each render is checked with speech recognition against its text and re-rendered (or retried with another Reference Clip) if words are dropped — the chosen fine-tune drops words about a third of the time (see ticket 02)
- [x] The site calls it server-side; the Modal token never reaches the browser
- [x] A hard monthly spending cap is set on the Modal account, and the site can tell when rendering is refused because of it
- [x] The desk's voice box speaks in Pete's voice

## Notes

- Deployed as Modal app `pete-voice` on an L40S: a warm Intro takes about 5.5s, a cold start about 60s, which is longer than ADR 0004's 10–30s estimate. If "warming up the decks" feels too long, try Modal memory snapshots or keep one container warm during busy hours.
- The site's server holds a Modal proxy auth token (`Modal-Key` / `Modal-Secret`) as the SST Secrets `ModalProxyTokenId` and `ModalProxyTokenSecret`. In local dev it reads them from the root `.env`.
- Rendering is two calls (start, then poll), because a cold start outlasts CloudFront's 30–60s request timeout. The voice box shows "Warming up the decks…" once a render has been pending for 4s.
- Budget detection is untested: Modal doesn't document what callers see when the cap is hit (see `is_budget_error` in `voice-service/app.py`). The desk shows an "off air" message on 402.
- There's no rate limit yet (that's ticket 10). Until then, abuse is bounded by the Modal spending cap and `max_containers=1`.
- The Jingle buttons still use browser text-to-speech; ticket 09 gives them Pete's voice.
