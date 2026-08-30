"""
CLI: pt-report
Summarises all clips already extracted — useful after partial runs.
"""

from __future__ import annotations

import json
from pathlib import Path

import click

from .config import cfg


@click.command()
@click.option("--output-dir", default=None, help="Clips directory to scan")
def main(output_dir: str | None) -> None:
    """Print a summary of all clips extracted so far."""
    clips_dir = Path(output_dir) if output_dir else cfg.output_dir / "clips"

    manifests = sorted(clips_dir.glob("*_manifest.json"))
    if not manifests:
        click.echo(f"No manifests found in {clips_dir}")
        raise SystemExit(1)

    all_clips: list[dict] = []
    for m in manifests:
        all_clips.extend(json.loads(m.read_text()))

    total_s = sum(c["duration_s"] for c in all_clips)
    avg_snr = sum(c["snr_db"] for c in all_clips) / max(len(all_clips), 1)

    click.echo(f"\n{'='*60}")
    click.echo("Pete Tong Voice Sample Report")
    click.echo("=" * 60)
    click.echo(f"  Sources processed : {len(manifests)}")
    click.echo(f"  Total clips       : {len(all_clips)}")
    click.echo(f"  Total duration    : {total_s:.0f}s  ({total_s / 60:.1f} min)")
    click.echo(f"  Average SNR       : {avg_snr:.1f} dB")

    click.echo("\n  Per-source breakdown:")
    by_source: dict[str, list[dict]] = {}
    for c in all_clips:
        by_source.setdefault(c["source_label"], []).append(c)
    for label, clips in sorted(by_source.items()):
        dur = sum(c["duration_s"] for c in clips)
        snr = sum(c["snr_db"] for c in clips) / len(clips)
        click.echo(f"    {label:<40} {len(clips):>4} clips  "
                   f"{dur / 60:>5.1f} min  SNR {snr:.1f} dB")

    click.echo()
    if total_s >= 1800:
        click.echo("  ✓  Ready for ElevenLabs Professional Voice Clone (30+ min)")
    elif total_s >= 600:
        click.echo("  ~  Usable but more audio will improve clone quality")
    else:
        click.echo("  ✗  Process more shows — need at least 10 min, ideally 30+")
    click.echo("=" * 60)


if __name__ == "__main__":
    main()
