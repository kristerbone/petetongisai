"""Step 4 — Speaker diarisation via pyannote.audio."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

from .config import cfg


def diarise(audio_path: Path, label: str) -> Path | None:
    """
    Run pyannote speaker diarisation.
    Returns path to JSON with speaker-labelled segments.
    """
    import torch
    from pyannote.audio import Pipeline

    json_path = cfg.output_dir / "diarisation" / f"{label}.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)

    if json_path.exists():
        print(f"  [skip] Diarisation already done for {label}")
        return json_path

    print(f"  Diarising speakers for {label}...")
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        token=cfg.hf_token,
    )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    pipeline.to(torch.device(device))
    print(f"    Device: {device}")

    diarisation = pipeline(str(audio_path)).speaker_diarization

    segments = [
        {
            "start": round(turn.start, 3),
            "end": round(turn.end, 3),
            "speaker": speaker,
            "duration": round(turn.end - turn.start, 3),
        }
        for turn, _, speaker in diarisation.itertracks(yield_label=True)
    ]

    speaker_count = len({s["speaker"] for s in segments})
    print(f"    Found {len(segments)} segments across {speaker_count} speakers")

    with open(json_path, "w") as f:
        json.dump({"label": label, "segments": segments}, f, indent=2)

    return json_path


def identify_dominant_speaker(json_path: Path) -> str:
    """
    Print per-speaker totals and return the dominant speaker ID.
    Call this after the first diarisation run to identify Pete's speaker label.
    """
    with open(json_path) as f:
        data = json.load(f)

    speaker_time: dict[str, float] = defaultdict(float)
    for seg in data["segments"]:
        speaker_time[seg["speaker"]] += seg["duration"]

    print("\n  Speaker breakdown (longest speaker = most likely Pete Tong):")
    for spk, total in sorted(speaker_time.items(), key=lambda x: -x[1]):
        print(f"    {spk}: {total:.0f}s  ({total / 60:.1f} min)")

    dominant = max(speaker_time, key=speaker_time.get)
    print(f"\n  Auto-selected: {dominant}  (override with --speaker SPEAKER_XX)\n")
    return dominant


def filter_segments(json_path: Path, speaker: str) -> list[dict]:
    """Return only segments belonging to the target speaker."""
    with open(json_path) as f:
        data = json.load(f)
    return [s for s in data["segments"] if s["speaker"] == speaker]
