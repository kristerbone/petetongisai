"""Build out/index.html: a local side-by-side listening page for every rendered variant."""
import html
import json
from common import LINES, REFS, ROOT

out = ROOT / "out"
models = sorted((json.loads(p.read_text()) for p in out.glob("*/results.json")), key=lambda m: m["model"])
by = {(m["model"], r["ref"], r["line"]): r for m in models for r in m["renders"]}
sp = out / "scores.json"
sc = {(r["model"], r["ref"], r["line"]): r for r in json.loads(sp.read_text())["renders"]} if sp.exists() else {}

def score(model, ref_id, line_id):
    x = sc.get((model, ref_id, line_id))
    return f' · like Pete {x["similarity"]:.2f} · errors {x["wer"]:.0%}<br><i>heard: {html.escape(x["heard"])}</i>' if x else ""


rows = []
for ref in REFS:
    rows.append(f'<h2>{ref["id"]} <audio controls preload="none" src="../{ref["file"]}"></audio></h2>'
                f'<p class="ref">Real Pete: “{html.escape(ref["text"])}”</p><table><tr><th>Line</th>'
                + "".join(f'<th>{m["model"]}</th>' for m in models) + "</tr>")
    for line in LINES:
        cells = []
        for m in models:
            r = by.get((m["model"], ref["id"], line["id"]))
            cells.append(f'<td><audio controls preload="none" src="{r["file"][4:]}"></audio><br><small>{r["render_s"]}s{score(m["model"], ref["id"], line["id"])}</small></td>'
                         if r else "<td>—</td>")
        rows.append(f'<tr><td><b>{line["kind"]}</b><br><small>{html.escape(line["text"])}</small></td>{"".join(cells)}</tr>')
    rows.append("</table>")

summary = "".join(f'<li><b>{m["model"]}</b>: load {m["load_s"]}s, avg render '
                  f'{round(sum(r["render_s"] for r in m["renders"]) / max(1, len(m["renders"])), 1)}s/line</li>' for m in models)
(out / "index.html").write_text(f"""<!doctype html><meta charset="utf-8"><title>Voice bake-off</title>
<style>body{{font:15px system-ui;max-width:1200px;margin:24px auto;padding:0 16px}}table{{border-collapse:collapse;width:100%}}
td,th{{border:1px solid #ccc;padding:6px;vertical-align:top}}audio{{width:220px}}.ref{{color:#555}}</style>
<h1>Pete voice bake-off (zero-shot, M2 Pro)</h1><ul>{summary}</ul>{''.join(rows)}""")
print("wrote", out / "index.html")
