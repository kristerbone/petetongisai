# 02: Voice model listening test

**What to build:** Choose Pete's voice by ear. On the M2 Pro, compare Chatterbox, XTTS-v2 and F5-TTS, each tried zero-shot from a Reference Clip and fine-tuned on the pipeline's ~59 minutes of clean Pete speech, all speaking the same handful of test lines (an Intro, a Track ID, a Jingle). See ADR 0002.

**Blocked by:** None (can start immediately)

**Status:** done — winner: Chatterbox (standard) + 20-epoch LoRA fine-tune (`voice-bakeoff/`)

- [x] The pipeline produces a shortlist of candidate Reference Clips and a fine-tuning set
- [x] Each model/variant renders the same test lines; outputs kept side by side for listening
- [x] Render time per line and hardware needs noted for each, to inform the Modal setup
- [x] Licence of the winner re-checked against the donations-only funding model
- [x] ADR 0002 updated to accepted, naming the winner (and noting whether its output is watermarked)

## Results

Median seconds per line; voice similarity and word error rate (WER) averaged over 5 Reference Clips × 4 lines.

| Model | Hardware | s/line | Similarity | WER |
|---|---|---|---|---|
| **Chatterbox, fine-tuned (e20)** | L40S | 6.9 | 0.696 | 0.384 |
| Chatterbox Turbo, fine-tuned (e20) | L40S | 2.7 | 0.696 | 0.827 |
| Chatterbox | M2 Pro | 13.5 | 0.681 | 0.110 |
| Chatterbox Turbo | M2 Pro | 6.6 | 0.720 | 0.158 |
| F5-TTS | M2 Pro | 11.6 | 0.682 | 0.181 |
| XTTS-v2 | M2 Pro | 10.6 | 0.585 | 0.160 |

Chosen by ear despite the higher WER. The dropped words have to be handled in 08 (check each render with speech recognition and re-render). For the fine-tune, Reference Clips ref3 and ref4 had the fewest errors.
