"""Build an LJSpeech-style fine-tuning set of 3-10s Pete clips from the pipeline output.

Re-cuts each clean clip from the 44.1kHz separated vocals, re-transcribes with word
timestamps, and splits at word boundaries (preferring sentence ends and pauses).
Run with the pipeline's venv (it has whisper):
  ../pete-tong-voice-pipeline/.venv/bin/python prep_dataset.py
"""
import glob
import json
import re
import subprocess
import tempfile
from pathlib import Path

import whisper

ROOT = Path(__file__).parent
PIPE = ROOT.parent / "pete-tong-voice-pipeline"
OUT = ROOT / "dataset"
WAVS = OUT / "wavs"
MIN_S, MAX_S = 3.0, 10.0
FIXES = [(r"\bPete Tom\b", "Pete Tong"), (r"\bPete Tongue\b", "Pete Tong"), (r"\bPetong\b", "Pete Tong")]


def fix(text):
    for pat, rep in FIXES:
        text = re.sub(pat, rep, text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip()


def cut(src, start, end, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{start:.3f}", "-to", f"{end:.3f}", "-i", str(src),
                    "-ac", "1", "-ar", "44100", str(dst)], check=True)


def segments(words):
    """Greedy split into MIN_S..MAX_S chunks, ending on sentence punctuation or a pause where possible."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        dur = cur[-1]["end"] - cur[0]["start"]
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 1.0
        sentence_end = w["word"].strip()[-1:] in ".!?"
        too_long_next = nxt is not None and nxt["end"] - cur[0]["start"] > MAX_S
        if dur >= MIN_S and (sentence_end or gap > 0.35 or too_long_next or nxt is None):
            out.append(cur)
            cur = []
        elif too_long_next:  # can't reach a nice boundary in time; drop the fragment if too short
            if dur >= MIN_S:
                out.append(cur)
            cur = []
    return out


def main():
    WAVS.mkdir(parents=True, exist_ok=True)
    asr = whisper.load_model("medium")
    rows = []
    for manifest in sorted(glob.glob(str(PIPE / "pete_tong_samples/clips/*_manifest.json"))):
        for clip in json.loads(Path(manifest).read_text()):
            label = clip["source_label"]
            vocals = PIPE / "pete_tong_samples/separated/htdemucs" / label / "vocals.wav"
            with tempfile.TemporaryDirectory() as tmp:
                whole = Path(tmp) / "clip.wav"
                cut(vocals, clip["source_start"], clip["source_end"], whole)
                result = asr.transcribe(str(whole), language="en", word_timestamps=True,
                                        initial_prompt="Pete Tong on Radio 1. Essential New Tune.")
                words = [w for s in result["segments"] for w in s.get("words", [])]
                for seg in segments(words):
                    start, end = max(0.0, seg[0]["start"] - 0.05), seg[-1]["end"] + 0.1
                    name = f"{Path(clip['file']).stem}_{len(rows):04d}"
                    cut(whole, start, end, WAVS / f"{name}.wav")
                    text = fix("".join(w["word"] for w in seg))
                    rows.append((name, text, round(end - start, 2)))
            print(f"{Path(clip['file']).stem}: total {len(rows)} segments")
    (OUT / "metadata.csv").write_text("".join(f"{n}|{t}|{t}\n" for n, t, _ in rows))
    total = sum(d for *_, d in rows)
    print(f"{len(rows)} segments, {total / 60:.1f} min, avg {total / len(rows):.1f}s")


if __name__ == "__main__":
    main()
