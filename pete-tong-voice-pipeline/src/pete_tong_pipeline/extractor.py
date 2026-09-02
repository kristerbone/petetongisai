"""Step 6+7 — Quality gate on SNR, merge/split segments, export WAV clips."""

from __future__ import annotations

import json
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from .config import cfg


# ---------------------------------------------------------------------------
# SNR estimate
# ---------------------------------------------------------------------------

def compute_snr(chunk: np.ndarray, sr: int) -> float:
    """
    Rough speech SNR: ratio of top-10% RMS frames to bottom-10% RMS frames.
    Returns dB value. Higher = cleaner speech relative to noise/music bleed.
    """
    rms = librosa.feature.rms(y=chunk, frame_length=2048, hop_length=512)[0]
    noise_floor = np.percentile(rms, 10)
    speech_level = np.percentile(rms, 90)
    if noise_floor < 1e-10:
        return 60.0
    return float(20 * np.log10(speech_level / noise_floor))


# ---------------------------------------------------------------------------
# Segment post-processing
# ---------------------------------------------------------------------------

def merge_adjacent(segments: list[dict]) -> list[dict]:
    """Merge segments with gaps smaller than max_gap_merge_s."""
    merged: list[dict] = []
    for seg in segments:
        if merged and (seg["start"] - merged[-1]["end"]) < cfg.max_gap_merge_s:
            merged[-1]["end"] = seg["end"]
            merged[-1]["duration"] = round(merged[-1]["end"] - merged[-1]["start"], 3)
            merged[-1]["transcript"] = (
                merged[-1].get("transcript", "") + " " + seg.get("transcript", "")
            ).strip()
        else:
            merged.append(dict(seg))
    return merged


def split_long(segment: dict) -> list[dict]:
    """Split segments longer than max_clip_duration into target_clip_duration chunks."""
    dur = segment["end"] - segment["start"]
    if dur <= cfg.max_clip_duration:
        return [segment]

    chunks = []
    t = segment["start"]
    while t < segment["end"]:
        chunk_end = min(t + cfg.target_clip_duration, segment["end"])
        if (chunk_end - t) >= cfg.min_clip_duration:
            chunks.append({**segment, "start": t, "end": chunk_end,
                           "duration": round(chunk_end - t, 3)})
        t = chunk_end
    return chunks


# ---------------------------------------------------------------------------
# Main export
# ---------------------------------------------------------------------------

def extract_clips(
    audio_path: Path,
    transcripts_path: Path,
    label: str,
) -> list[dict]:
    """
    Quality-gate segments, merge/split, write individual WAV clips.
    Returns manifest list.
    """
    clips_dir = cfg.output_dir / "clips" / label
    clips_dir.mkdir(parents=True, exist_ok=True)

    with open(transcripts_path) as f:
        segments: list[dict] = json.load(f)

    audio_data, sr = sf.read(str(audio_path))

    # --- SNR quality gate ---
    kept, rejected = [], 0
    for seg in segments:
        if seg["duration"] < cfg.min_clip_duration:
            rejected += 1
            continue

        s = int(seg["start"] * sr)
        e = int(seg["end"] * sr)
        chunk = audio_data[s:e].astype(np.float32)
        snr = compute_snr(chunk, sr)

        if snr < cfg.min_snr_db:
            rejected += 1
            continue

        seg["snr_db"] = round(snr, 1)
        kept.append(seg)

    print(f"  Quality gate: {len(kept)} kept, {rejected} rejected  "
          f"(SNR threshold: {cfg.min_snr_db} dB)")

    # --- Split overlong merged segments ---
    final: list[dict] = []
    for seg in kept:
        final.extend(split_long(seg))

    # --- Write WAV clips ---
    manifest: list[dict] = []
    for i, seg in enumerate(final):
        s = int(seg["start"] * sr)
        e = int(seg["end"] * sr)
        chunk = audio_data[s:e]

        clip_name = f"{label}_{i:04d}.wav"
        sf.write(str(clips_dir / clip_name), chunk, sr)

        manifest.append({
            "file": str(clips_dir / clip_name),
            "duration_s": round(seg["end"] - seg["start"], 2),
            "transcript": seg.get("transcript", ""),
            "snr_db": seg.get("snr_db", 0.0),
            "source_label": label,
            "source_start": seg["start"],
            "source_end": seg["end"],
        })

    manifest_path = cfg.output_dir / "clips" / f"{label}_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    total_s = sum(e["duration_s"] for e in manifest)
    print(f"  Exported {len(manifest)} clips — {total_s:.0f}s / {total_s / 60:.1f} min")
    return manifest
