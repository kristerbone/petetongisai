"""
CLI: pt-probe-speakers

pyannote clusters voices by acoustic similarity, not by "who is talking vs.
singing" — on a music-heavy DJ set, the top speaker by total duration is
often a recurring sung-vocal texture (or near-silence), not the host. This
transcribes a couple of each top candidate's longest turns so you can tell
talk from song by content before committing --speaker to a full pt-extract
run.

Requires diarisation to have already been run (pt-extract gets that far
even before you know the right speaker — the diarisation JSON and
resampled audio are cached and reused here).
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import click
import json as jsonlib
import soundfile as sf

from .config import cfg


@click.command()
@click.option("--label", default=None,
              help="Only probe this source label. Default: every cached diarisation.")
@click.option("--top", "top_n", default=5, show_default=True,
              help="Number of top candidate speakers to sample per source")
@click.option("--samples", "samples_per_speaker", default=2, show_default=True,
              help="Number of longest segments to transcribe per candidate")
@click.option("--whisper-model", default=None,
              type=click.Choice(["tiny", "base", "small", "medium", "large"]),
              help="Whisper model size (default: medium)")
def main(label: str | None, top_n: int, samples_per_speaker: int, whisper_model: str | None) -> None:
    """Sample top candidate speakers per show and transcribe a few of their
    longest turns, so you can pick the real host before a full extraction."""
    import whisper

    if whisper_model:
        cfg.whisper_model = whisper_model

    diar_dir = cfg.output_dir / "diarisation"
    diar_files = sorted(diar_dir.glob(f"{label}.json" if label else "*.json"))
    if not diar_files:
        click.echo(f"No diarisation JSON found in {diar_dir}. Run pt-extract first "
                    "(it caches diarisation even if you don't yet know the right --speaker).")
        raise SystemExit(1)

    click.echo(f"Loading Whisper model: {cfg.whisper_model}")
    model = whisper.load_model(cfg.whisper_model)

    for diar_file in diar_files:
        src_label = diar_file.stem
        data = jsonlib.loads(diar_file.read_text())
        segments = data["segments"]

        by_speaker: dict[str, list[dict]] = defaultdict(list)
        for s in segments:
            by_speaker[s["speaker"]].append(s)

        totals = {spk: sum(s["duration"] for s in segs) for spk, segs in by_speaker.items()}
        top_speakers = sorted(totals, key=totals.get, reverse=True)[:top_n]

        wav_path = cfg.output_dir / "resampled" / f"{src_label}_16k.wav"
        if not wav_path.exists():
            click.echo(f"  [skip] {src_label}: resampled audio not found at {wav_path}")
            continue
        audio, sr = sf.read(str(wav_path))

        click.echo(f"\n{'='*70}\n{src_label}\n{'='*70}")
        for spk in top_speakers:
            longest = sorted(by_speaker[spk], key=lambda s: -s["duration"])[:samples_per_speaker]
            click.echo(f"\n  {spk}  (total {totals[spk]:.0f}s)")
            for seg in longest:
                s, e = int(seg["start"] * sr), int(seg["end"] * sr)
                chunk = audio[s:e].astype("float32")
                if len(chunk) < sr * 0.5:
                    continue
                result = model.transcribe(chunk, language="en", fp16=False)
                text = result["text"].strip()[:120]
                click.echo(f"    [{seg['duration']:.1f}s @ {seg['start']:.0f}s] {text}")

    click.echo("\nOnce you've identified the real host's SPEAKER_XX label per show, "
                "re-run pt-extract with --speaker SPEAKER_XX for that source.")


if __name__ == "__main__":
    main()
