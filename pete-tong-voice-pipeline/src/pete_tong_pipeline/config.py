"""
Centralised configuration.
Values can be overridden via environment variables or a .env file.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    # ------------------------------------------------------------------ paths
    output_dir: Path = field(default_factory=lambda: Path(
        os.getenv("PT_OUTPUT_DIR", "./pete_tong_samples")
    ))

    # ---------------------------------------------------- clip quality limits
    min_clip_duration: float = float(os.getenv("PT_MIN_CLIP_S", "5"))
    max_clip_duration: float = float(os.getenv("PT_MAX_CLIP_S", "120"))
    target_clip_duration: float = float(os.getenv("PT_TARGET_CLIP_S", "45"))
    min_snr_db: float = float(os.getenv("PT_MIN_SNR_DB", "12"))
    max_gap_merge_s: float = float(os.getenv("PT_MAX_GAP_S", "1.5"))

    # ----------------------------------------------------------- model choices
    whisper_model: str = os.getenv("PT_WHISPER_MODEL", "medium")
    demucs_model: str = os.getenv("PT_DEMUCS_MODEL", "htdemucs")
    sample_rate: int = int(os.getenv("PT_SAMPLE_RATE", "16000"))

    # ------------------------------------------------------------ credentials
    hf_token: str = os.getenv("HF_TOKEN", "")

    def validate(self) -> None:
        if not self.hf_token:
            raise ValueError(
                "HuggingFace token required. Set HF_TOKEN in .env or pass --hf-token."
            )
        self.output_dir.mkdir(parents=True, exist_ok=True)


# Singleton — import and mutate as needed
cfg = Config()
