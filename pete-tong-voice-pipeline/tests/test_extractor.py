"""Tests for the SNR and segment processing logic — no GPU/model deps needed."""

import numpy as np
import pytest

from pete_tong_pipeline.extractor import compute_snr, merge_adjacent, split_long


def make_seg(start: float, end: float, speaker: str = "SPEAKER_00") -> dict:
    return {"start": start, "end": end, "duration": end - start,
            "speaker": speaker, "transcript": "test"}


def test_compute_snr_clean_signal():
    sr = 16000
    t = np.linspace(0, 1, sr)
    chunk = np.sin(2 * np.pi * 440 * t).astype(np.float32)
    snr = compute_snr(chunk, sr)
    assert snr > 0


def test_compute_snr_silence():
    chunk = np.zeros(16000, dtype=np.float32)
    snr = compute_snr(chunk, 16000)
    assert snr == 60.0  # silence → returns max


def test_merge_adjacent_merges_close_segments():
    segs = [make_seg(0, 10), make_seg(11, 20)]  # 1s gap < default 1.5s
    from pete_tong_pipeline.config import cfg
    original = cfg.max_gap_merge_s
    cfg.max_gap_merge_s = 1.5
    merged = merge_adjacent(segs)
    cfg.max_gap_merge_s = original
    assert len(merged) == 1
    assert merged[0]["end"] == 20


def test_merge_adjacent_keeps_distant_segments():
    segs = [make_seg(0, 10), make_seg(15, 25)]  # 5s gap > 1.5s
    from pete_tong_pipeline.config import cfg
    original = cfg.max_gap_merge_s
    cfg.max_gap_merge_s = 1.5
    merged = merge_adjacent(segs)
    cfg.max_gap_merge_s = original
    assert len(merged) == 2


def test_split_long_splits_oversized_segment():
    from pete_tong_pipeline.config import cfg
    cfg.max_clip_duration = 60
    cfg.target_clip_duration = 30
    cfg.min_clip_duration = 5
    seg = make_seg(0, 150)
    chunks = split_long(seg)
    assert len(chunks) > 1
    for c in chunks:
        assert c["duration"] <= cfg.target_clip_duration + 1  # allow rounding


def test_split_long_leaves_short_segment_intact():
    from pete_tong_pipeline.config import cfg
    cfg.max_clip_duration = 60
    seg = make_seg(0, 30)
    chunks = split_long(seg)
    assert len(chunks) == 1
