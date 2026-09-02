"""
CLI: pt-extract
Main pipeline orchestrator — download → separate → diarise → transcribe → export.
"""

from __future__ import annotations

import json
from pathlib import Path

import click

from .config import cfg
from .diariser import diarise, filter_segments, identify_dominant_speaker
from .downloader import download
from .extractor import extract_clips, merge_adjacent
from .separator import resample, separate_vocals
from .sources import SOURCES, Source
from .transcriber import transcribe


def process_source(source: Source, speaker_override: str | None) -> list[dict] | None:
    label = source.label
    click.echo(f"\n{'='*60}")
    click.echo(f"Processing: {label}")
    if source.notes:
        click.echo(f"  {source.notes}")
    click.echo("=" * 60)

    raw_path = download(source.url, label)
    if not raw_path:
        return None

    vocals_path = separate_vocals(raw_path)
    if not vocals_path:
        return None

    resampled_path = resample(vocals_path)

    diar_path = diarise(resampled_path, label)
    if not diar_path:
        return None

    # pyannote's SPEAKER_XX labels are local to each file's own clustering —
    # they don't identify the same person across different diarisation runs,
    # so auto-detect fresh per source unless the caller pinned a label.
    target_speaker = speaker_override or identify_dominant_speaker(diar_path)

    segments = filter_segments(diar_path, target_speaker)
    segments = merge_adjacent(segments)
    click.echo(f"  Target speaker '{target_speaker}': {len(segments)} segments after merging")

    transcripts_path = transcribe(resampled_path, segments, label)

    return extract_clips(resampled_path, transcripts_path, label)


def print_summary(all_manifests: list[list[dict]]) -> None:
    flat = [entry for m in all_manifests for entry in m]
    total_clips = len(flat)
    total_s = sum(e["duration_s"] for e in flat)
    avg_snr = sum(e["snr_db"] for e in flat) / max(total_clips, 1)

    click.echo(f"\n{'='*60}")
    click.echo("EXTRACTION COMPLETE")
    click.echo("=" * 60)
    click.echo(f"  Total clips    : {total_clips}")
    click.echo(f"  Total duration : {total_s:.0f}s  ({total_s / 60:.1f} min)")
    click.echo(f"  Average SNR    : {avg_snr:.1f} dB")
    click.echo(f"  Output         : {cfg.output_dir / 'clips'}")

    if total_s >= 1800:
        click.echo("\n  ✓  30+ min — enough for a solid ElevenLabs voice clone")
    elif total_s >= 600:
        click.echo("\n  ~  Getting there — process more shows for best results")
    else:
        click.echo("\n  ✗  Under 10 min — process more shows before uploading")
    click.echo("=" * 60)


@click.command()
@click.option("--hf-token", envvar="HF_TOKEN", default="",
              help="HuggingFace token (or set HF_TOKEN env var / .env)")
@click.option("--speaker", default=None,
              help="Speaker ID to target, e.g. SPEAKER_00. Auto-detected if omitted.")
@click.option("--whisper-model", default=None,
              type=click.Choice(["tiny", "base", "small", "medium", "large"]),
              help="Whisper model size (default: medium)")
@click.option("--output-dir", default=None,
              help="Output directory (default: ./pete_tong_samples)")
@click.option("--sources", "sources_file", default=None,
              help="JSON file from pt-find-sources. Overrides built-in SOURCES list.")
@click.option("--snr", default=None, type=float,
              help="Minimum SNR in dB to keep a clip (default: 12.0)")
def main(
    hf_token: str,
    speaker: str | None,
    whisper_model: str | None,
    output_dir: str | None,
    sources_file: str | None,
    snr: float | None,
) -> None:
    """Extract Pete Tong voice samples from DJ sets and radio shows."""

    # Override config from CLI args
    if hf_token:
        cfg.hf_token = hf_token
    if whisper_model:
        cfg.whisper_model = whisper_model
    if output_dir:
        cfg.output_dir = Path(output_dir)
    if snr is not None:
        cfg.min_snr_db = snr

    cfg.validate()

    # Resolve source list
    sources: list[Source] = SOURCES
    if sources_file:
        raw = json.loads(Path(sources_file).read_text())
        sources = [Source(**s) for s in raw]
        click.echo(f"Loaded {len(sources)} sources from {sources_file}")

    if not sources:
        click.echo("No sources configured. Run pt-find-sources first.")
        raise SystemExit(1)

    all_manifests: list[list[dict]] = []
    for source in sources:
        manifest = process_source(source, speaker)
        if manifest:
            all_manifests.append(manifest)

    print_summary(all_manifests)


if __name__ == "__main__":
    main()
