"""
CLI: pt-find-sources
Searches YouTube and Mixcloud for Pete Tong shows.
Outputs a sources_found.json and prints a SOURCES[] block ready to paste.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import click

YOUTUBE_QUERIES = [
    "Pete Tong Essential Mix Radio 1",
    "Pete Tong Essential Mix BBC full",
    "Pete Tong Ibiza Classics live",
    "Pete Tong Essential Selection full show",
    "Pete Tong radio show 2 hours",
]

MIXCLOUD_FEEDS = [
    "https://www.mixcloud.com/PeteTong/",
    "https://www.mixcloud.com/BBCRadio1/playlists/essential-mix/",
]

MIN_DURATION_S = 1800  # 30 min


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text)
    return text.strip("_")[:50]


def yt_dlp_json(args: list[str]) -> list[dict]:
    cmd = ["yt-dlp", "--dump-json", "--flat-playlist", "--no-warnings", "--quiet", *args]
    result = subprocess.run(cmd, capture_output=True, text=True)
    entries = []
    for line in result.stdout.strip().splitlines():
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    return entries


def search_youtube(query: str, max_results: int) -> list[dict]:
    entries = yt_dlp_json([f"ytsearch{max_results}:{query}"])
    sources = []
    for d in entries:
        dur = d.get("duration") or 0
        if dur < MIN_DURATION_S:
            continue
        sources.append({
            "url": f"https://www.youtube.com/watch?v={d['id']}",
            "label": slugify(d.get("title", d["id"])),
            "title": d.get("title", ""),
            "duration_min": round(dur / 60),
            "notes": f"{round(dur/60)} min — YouTube",
        })
    return sources


def list_mixcloud(feed_url: str, max_results: int) -> list[dict]:
    entries = yt_dlp_json([feed_url, "--playlist-end", str(max_results)])
    sources = []
    for d in entries:
        dur = d.get("duration") or 0
        if dur < MIN_DURATION_S:
            continue
        url = d.get("url") or d.get("webpage_url") or d.get("id", "")
        if not url.startswith("http"):
            url = f"https://www.mixcloud.com{url}"
        sources.append({
            "url": url,
            "label": slugify(d.get("title", "mixcloud")),
            "title": d.get("title", ""),
            "duration_min": round(dur / 60),
            "notes": f"{round(dur/60)} min — Mixcloud",
        })
    return sources


@click.command()
@click.option("--max", "max_total", default=20, show_default=True,
              help="Max number of sources to find")
@click.option("--output", default="sources_found.json", show_default=True,
              help="Output JSON path")
def main(max_total: int, output: str):
    """Find Pete Tong show URLs on YouTube and Mixcloud."""
    all_sources: list[dict] = []
    seen: set[str] = set()

    click.echo("Searching YouTube...")
    per_query = max(2, max_total // len(YOUTUBE_QUERIES))
    for q in YOUTUBE_QUERIES:
        click.echo(f"  '{q}'")
        for s in search_youtube(q, per_query):
            if s["url"] not in seen:
                seen.add(s["url"])
                all_sources.append(s)

    click.echo("\nSearching Mixcloud...")
    per_feed = max(3, max_total // len(MIXCLOUD_FEEDS))
    for feed in MIXCLOUD_FEEDS:
        click.echo(f"  {feed}")
        for s in list_mixcloud(feed, per_feed):
            if s["url"] not in seen:
                seen.add(s["url"])
                all_sources.append(s)

    all_sources.sort(key=lambda x: -x["duration_min"])
    all_sources = all_sources[:max_total]

    Path(output).write_text(json.dumps(all_sources, indent=2))
    click.echo(f"\nSaved {len(all_sources)} sources to {output}")

    click.echo("\nPaste this into sources.py or pass --sources to pt-extract:\n")
    click.echo("SOURCES = [")
    for s in all_sources:
        click.echo(f'    Source(url="{s["url"]}", label="{s["label"]}", '
                   f'notes="{s["notes"]}: {s["title"][:50]}"),')
    click.echo("]")


if __name__ == "__main__":
    main()
