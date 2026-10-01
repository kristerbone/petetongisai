"""Shared helpers for the voice bake-off: load refs/lines, time renders, record results."""
import json
import time
from pathlib import Path

ROOT = Path(__file__).parent
REFS = json.loads((ROOT / "refs" / "refs.json").read_text())
LINES = json.loads((ROOT / "lines.json").read_text())


def run(model_name, load, render, ref_ids=None):
    """load() -> model; render(model, ref, line, out_path) writes a wav."""
    out_dir = ROOT / "out" / model_name
    out_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    model = load()
    load_s = round(time.time() - t0, 1)
    print(f"[{model_name}] loaded in {load_s}s")
    results = []
    for ref in REFS:
        if ref_ids and ref["id"] not in ref_ids:
            continue
        ref = {**ref, "path": str(ROOT / ref["file"])}
        for line in LINES:
            out = out_dir / f"{ref['id']}_{line['id']}.wav"
            t = time.time()
            render(model, ref, line, out)
            secs = round(time.time() - t, 1)
            print(f"[{model_name}] {out.name}: {secs}s")
            results.append({"ref": ref["id"], "line": line["id"], "file": str(out.relative_to(ROOT)), "render_s": secs})
    path = out_dir / "results.json"
    prev = json.loads(path.read_text())["renders"] if path.exists() else []
    done = {(r["ref"], r["line"]) for r in results}
    merged = [r for r in prev if (r["ref"], r["line"]) not in done] + results
    path.write_text(json.dumps({"model": model_name, "load_s": load_s, "renders": merged}, indent=1))
