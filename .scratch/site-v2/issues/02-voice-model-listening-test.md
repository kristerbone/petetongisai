# 02: Voice model listening test

**What to build:** Choose Pete's voice by ear. On the M2 Pro, compare Chatterbox, XTTS-v2 and F5-TTS, each tried zero-shot from a Reference Clip and fine-tuned on the pipeline's ~59 minutes of clean Pete speech, all speaking the same handful of test lines (an Intro, a Track ID, a Jingle). See ADR 0002.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] The pipeline produces a shortlist of candidate Reference Clips and a fine-tuning set
- [ ] Each model/variant renders the same test lines; outputs kept side by side for listening
- [ ] Render time per line and hardware needs noted for each, to inform the Modal setup
- [ ] Licence of the winner re-checked against the donations-only funding model
- [ ] ADR 0002 updated to accepted, naming the winner (and noting whether its output is watermarked)
