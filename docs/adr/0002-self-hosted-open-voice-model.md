---
status: proposed
---

# Self-hosted open voice model for Pete's voice, not ElevenLabs

Pete's voice is synthesised with a self-hosted, openly available voice-cloning model rather than ElevenLabs. ElevenLabs Professional Voice Clones can only be made of the account holder's own voice (enforced by a live voice-captcha), so the pipeline's clips can't produce one, and an Instant Voice Clone of a well-known voice risks being blocked. The specific model is chosen by a listening test on the pipeline's ~59 minutes of clean Pete speech: Chatterbox (MIT), XTTS-v2 (Coqui Public Model License, non-commercial) and F5-TTS (CC-BY-NC weights), each tried zero-shot from a Reference Clip and fine-tuned. The site runs on donations that only cover hosting, with no ads, so the non-commercial licences are in scope. This ADR is accepted, naming the winner, once the test is done.

## Consequences

- All Pete audio on the site (Jingles, Intros, Track IDs) is AI-generated. No broadcast audio is republished.
- Only Chatterbox embeds an inaudible watermark (Resemble's Perth). If another model wins, the "AI voice, not Pete Tong" label is the only disclosure.
- If Pete ever creates and shares an official clone, ElevenLabs becomes an option again.
