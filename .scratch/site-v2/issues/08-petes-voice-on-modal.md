# 08: Pete's voice on Modal

**What to build:** The winning voice model from the listening test runs on Modal, and the site can turn a line of text into Pete's voice. The desk's voice box uses it in place of browser text-to-speech. See ADR 0004.

**Blocked by:** 01, 02, 04

**Status:** ready-for-agent

- [ ] The model runs on a Modal GPU, scaling to zero when idle, using the chosen Reference Clip or fine-tuned weights
- [ ] The site calls it server-side; the Modal token never reaches the browser
- [ ] A hard monthly spending cap is set on the Modal account, and the site can tell when rendering is refused because of it
- [ ] The desk's voice box speaks in Pete's voice
