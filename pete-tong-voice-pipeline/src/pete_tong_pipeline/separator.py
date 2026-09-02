"""Step 2+3 — Separate vocals from music bed, then resample to 16kHz mono."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from .config import cfg


def separate_vocals(audio_path: Path) -> Path | None:
    """
    Run Demucs with --two-stems vocals.
    Output: <output_dir>/separated/<model>/<stem>/vocals.wav
    """
    vocals_path = (
        cfg.output_dir
        / "separated"
        / cfg.demucs_model
        / audio_path.stem
        / "vocals.wav"
    )

    if vocals_path.exists():
        print(f"  [skip] Vocals already separated for {audio_path.stem}")
        return vocals_path

    print(f"  Separating vocals with Demucs ({cfg.demucs_model}) — this takes a while...")
    cmd = [
        sys.executable, "-m", "demucs",
        "--two-stems", "vocals",
        "--name", cfg.demucs_model,
        "--out", str(cfg.output_dir / "separated"),
        str(audio_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  [error] Demucs failed:\n{result.stderr[:400]}")
        return None

    if not vocals_path.exists():
        print(f"  [error] Expected vocals at {vocals_path} — not found after Demucs run")
        return None

    return vocals_path


def resample(audio_path: Path) -> Path:
    """Resample to 16kHz mono WAV — required by pyannote and Whisper."""
    out_dir = cfg.output_dir / "resampled"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{audio_path.parent.name}_16k.wav"

    if out_path.exists():
        print(f"  [skip] Already resampled: {out_path.name}")
        return out_path

    print(f"  Resampling to {cfg.sample_rate}Hz mono...")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(audio_path),
            "-ar", str(cfg.sample_rate),
            "-ac", "1",
            str(out_path),
        ],
        capture_output=True,
        check=True,
    )
    return out_path
