"""Step 5 — Transcribe speech segments with OpenAI Whisper."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import soundfile as sf

from .config import cfg


def transcribe(audio_path: Path, segments: list[dict], label: str) -> Path:
    """
    Transcribe each diarised segment.
    Skips segments shorter than min_clip_duration.
    Returns path to JSON transcript file.
    """
    import whisper

    json_path = cfg.output_dir / "transcripts" / f"{label}.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)

    if json_path.exists():
        print(f"  [skip] Transcripts already exist for {label}")
        return json_path

    print(f"  Loading Whisper model: {cfg.whisper_model}")
    model = whisper.load_model(cfg.whisper_model)

    audio_data, sr = sf.read(str(audio_path))
    transcribed: list[dict] = []

    eligible = [s for s in segments if s["duration"] >= cfg.min_clip_duration]
    print(f"  Transcribing {len(eligible)} segments (of {len(segments)} total)...")

    for i, seg in enumerate(eligible, 1):
        start_sample = int(seg["start"] * sr)
        end_sample = int(seg["end"] * sr)
        chunk = audio_data[start_sample:end_sample].astype(np.float32)

        result = model.transcribe(chunk, language="en", fp16=False)

        entry = dict(seg)
        entry["transcript"] = result["text"].strip()
        entry["whisper_avg_logprob"] = round(result.get("avg_logprob", 0.0), 4)
        transcribed.append(entry)

        if i % 20 == 0:
            print(f"    {i}/{len(eligible)} segments transcribed")

    with open(json_path, "w") as f:
        json.dump(transcribed, f, indent=2)

    print(f"  Transcription complete: {len(transcribed)} segments")
    return json_path
