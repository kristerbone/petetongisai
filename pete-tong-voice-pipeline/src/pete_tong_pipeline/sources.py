"""
Source catalogue.
Add/remove entries here. The pipeline processes all of them in order.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Source:
    url: str
    label: str
    notes: str = ""


# ---------------------------------------------------------------------------
# Built-in sources
# Add more by appending to this list or by running pt-find-sources.
# ---------------------------------------------------------------------------

SOURCES: list[Source] = [
    Source(
        url="https://www.mixcloud.com/PeteTong/essential-mix-pete-tong-2024/",
        label="essential_mix_2024",
        notes="Annual NYE Essential Mix — extensive speech between tracks",
    ),
    Source(
        url="https://www.youtube.com/watch?v=Jm2M2kYFLAk",
        label="essential_mix_ibiza_classics",
        notes="Ibiza Classics set — rich commentary throughout",
    ),
    # Add more sources here — or let pt-find-sources populate sources_found.json
    # and import them with: pt-extract --sources sources_found.json
]
