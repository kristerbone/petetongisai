"""Step 1 — Download audio via yt-dlp."""

from __future__ import annotations

import subprocess
from pathlib import Path

from .config import cfg


def download(url: str, label: str) -> Path | None:
    """Download audio as high-quality MP3. Returns path or None on failure."""
    out_dir = cfg.output_dir / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{label}.mp3"

    if out_path.exists():
        print(f"  [skip] {label} already downloaded")
        return out_path

    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--output", str(out_path.with_suffix("")),
        "--no-playlist",
        "--quiet",
        "--progress",
        url,
    ]
    print(f"  Downloading: {label}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  [error] Download failed:\n{result.stderr[:400]}")
        return None

    if not out_path.exists():
        print(f"  [error] Expected output not found at {out_path}")
        return None

    return out_path
