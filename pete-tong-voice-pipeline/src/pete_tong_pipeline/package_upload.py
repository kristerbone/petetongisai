"""
CLI: pt-package-upload

ElevenLabs voice cloning caps uploads at a fixed number of files and a
max size per file. Individual extracted clips are usually much smaller
than that cap, which wastes upload slots — this merges them into
larger, balanced files (in original show/clip order, with a short
silence between spliced clips) so the full extracted duration fits
within the platform's limits.
"""

from __future__ import annotations

import json
from pathlib import Path

import click
import numpy as np
import soundfile as sf

from .config import cfg


@click.command()
@click.option("--max-files", default=25, show_default=True,
              help="Maximum number of merged files to produce")
@click.option("--max-mb", default=10.0, show_default=True,
              help="Maximum size per merged file, in MB")
@click.option("--silence-s", default=0.35, show_default=True,
              help="Silence gap inserted between spliced clips, in seconds")
@click.option("--output-dir", default=None,
              help="Where to write merged files (default: <output_dir>/elevenlabs_upload)")
def main(max_files: int, max_mb: float, silence_s: float, output_dir: str | None) -> None:
    """Merge extracted clips into <= max-files WAVs, each under max-mb, for upload."""
    clips_dir = cfg.output_dir / "clips"
    out_dir = Path(output_dir) if output_dir else cfg.output_dir / "elevenlabs_upload"
    out_dir.mkdir(parents=True, exist_ok=True)
    max_bytes = int(max_mb * 1024 * 1024)

    clips: list[dict] = []
    for manifest_path in sorted(clips_dir.glob("*_manifest.json")):
        entries = json.loads(manifest_path.read_text())
        for e in entries:
            wav_path = Path(e["file"])
            clips.append({
                "file": wav_path,
                "size": wav_path.stat().st_size,
                "duration_s": e["duration_s"],
                "transcript": e.get("transcript", ""),
                "source_label": e["source_label"],
            })

    if not clips:
        click.echo(f"No clip manifests found in {clips_dir}. Run pt-extract first.")
        raise SystemExit(1)

    total_bytes = sum(c["size"] for c in clips)
    total_duration = sum(c["duration_s"] for c in clips)
    click.echo(f"Input: {len(clips)} clips, {total_bytes/1e6:.1f}MB, {total_duration/60:.1f} min")

    if total_bytes / max_files > max_bytes:
        click.echo(
            f"Average bin size ({total_bytes/max_files/1e6:.1f}MB) exceeds {max_mb:.0f}MB cap "
            f"even split across {max_files} files — raise --max-files or --max-mb."
        )
        raise SystemExit(1)

    # Greedy balanced bin-packing, preserving clip order.
    bins: list[list[dict]] = []
    current_bin: list[dict] = []
    current_size = 44  # approx WAV header overhead
    remaining_total = total_bytes
    remaining_bins = max_files

    for clip in clips:
        target = remaining_total / remaining_bins
        if (current_bin
                and (current_size + clip["size"] > target or current_size + clip["size"] > max_bytes)
                and remaining_bins > 1):
            bins.append(current_bin)
            remaining_total -= current_size
            remaining_bins -= 1
            current_bin = []
            current_size = 44
        current_bin.append(clip)
        current_size += clip["size"]
    bins.append(current_bin)

    click.echo(f"Packed into {len(bins)} bins")

    sr = cfg.sample_rate
    silence = np.zeros(int(sr * silence_s), dtype=np.int16)

    merged_manifest = []
    for i, b in enumerate(bins, 1):
        chunks = []
        for j, clip in enumerate(b):
            audio, file_sr = sf.read(str(clip["file"]), dtype="int16")
            if file_sr != sr:
                click.echo(f"  [error] {clip['file']} is {file_sr}Hz, expected {sr}Hz — skipping")
                continue
            chunks.append(audio)
            if j < len(b) - 1:
                chunks.append(silence)
        merged_audio = np.concatenate(chunks)

        out_name = f"pete_tong_voice_{i:02d}.wav"
        out_path = out_dir / out_name
        sf.write(str(out_path), merged_audio, sr, subtype="PCM_16")

        actual_size = out_path.stat().st_size
        actual_duration = len(merged_audio) / sr
        if actual_size > max_bytes:
            click.echo(f"  [error] {out_name} is {actual_size/1e6:.2f}MB — exceeds {max_mb:.0f}MB cap!")
            raise SystemExit(1)

        merged_manifest.append({
            "file": str(out_path),
            "size_mb": round(actual_size / 1e6, 2),
            "duration_s": round(actual_duration, 1),
            "num_source_clips": len(b),
            "source_shows": sorted(set(c["source_label"] for c in b)),
            "transcript": " / ".join(c["transcript"] for c in b if c["transcript"]),
        })
        click.echo(f"  {out_name}: {actual_size/1e6:.2f}MB, {actual_duration/60:.1f} min, {len(b)} clips")

    (out_dir / "upload_manifest.json").write_text(json.dumps(merged_manifest, indent=2))

    total_out_bytes = sum(m["size_mb"] for m in merged_manifest) * 1e6
    total_out_s = sum(m["duration_s"] for m in merged_manifest)
    click.echo(f"\nDone: {len(merged_manifest)} files, {total_out_bytes/1e6:.1f}MB, "
               f"{total_out_s/60:.1f} min total")
    click.echo(f"Output: {out_dir}/")


if __name__ == "__main__":
    main()
