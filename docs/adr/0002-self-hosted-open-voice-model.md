---
status: accepted
---

# Self-hosted open voice model for Pete's voice, not ElevenLabs

Pete's voice is synthesised with a self-hosted, openly available voice-cloning model rather than ElevenLabs. ElevenLabs Professional Voice Clones can only be made of the account holder's own voice (enforced by a live voice-captcha), so the pipeline's clips can't produce one, and an Instant Voice Clone of a well-known voice risks being blocked.

The model was chosen by ear in a listening test (`voice-bakeoff/`) on the pipeline's clean Pete speech: Chatterbox, Chatterbox Turbo, XTTS-v2 and F5-TTS zero-shot from five Reference Clips, plus LoRA fine-tunes of both Chatterbox variants (20 epochs on 426 clips). **The winner is standard Chatterbox with a 20-epoch LoRA fine-tune.** Chatterbox weights and code are MIT (Resemble AI); the fine-tuning kit (gokhaneraslan/chatterbox-finetuning) is Apache-2.0. Neither restricts a donations-funded site.

## Consequences

- All Pete audio on the site (Jingles, Intros, Track IDs) is AI-generated. No broadcast audio is republished.
- Every render carries Resemble's inaudible Perth watermark (applied inside `generate()`, including on the fine-tuned path), alongside the "AI voice, not Pete Tong" label.
- The fine-tune sometimes drops words or whole clauses (mean word error rate 0.38 in the test, against 0.11 zero-shot), and names suffer most. Intros carry visitors' names, so the server checks each render with speech recognition and re-renders, or falls back to a different Reference Clip, before using it.
- Rendering runs on a GPU: about 7s per line on an L40S (13s on the M2 Pro zero-shot). The LoRA adapter is about 6 minutes to train and lives on the `pete-voice` Modal Volume.
- If Pete ever creates and shares an official clone, ElevenLabs becomes an option again.
