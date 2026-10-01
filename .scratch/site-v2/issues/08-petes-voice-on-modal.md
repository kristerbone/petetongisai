# 08: Pete's voice on Modal

**What to build:** The winning voice model from the listening test runs on Modal, and the site can turn a line of text into Pete's voice. The desk's voice box uses it in place of browser text-to-speech. See ADR 0004.

**Blocked by:** 01, 02, 04

**Status:** in progress: Modal side done (`voice-service/`); site wiring waits on 04

- [x] The model runs on a Modal GPU, scaling to zero when idle, using the chosen Reference Clip or fine-tuned weights
- [x] Each render is checked with speech recognition against its text and re-rendered (or retried with another Reference Clip) if words are dropped — the chosen fine-tune drops words about a third of the time (see ticket 02)
- [ ] The site calls it server-side; the Modal token never reaches the browser
- [ ] (human: Modal dashboard → Settings → Usage & Billing) A hard monthly spending cap is set on the Modal account, and the site can tell when rendering is refused because of it
- [ ] The desk's voice box speaks in Pete's voice

## Notes

- Deployed as Modal app `pete-voice` on an L40S: a warm Intro takes about 5.5s, a cold start about 60s, which is longer than ADR 0004's 10–30s estimate. If "warming up the decks" feels too long, try Modal memory snapshots or keep one container warm during busy hours.
- The site's server needs a Modal proxy auth token (`Modal-Key` / `Modal-Secret`), not the Modal API token.
