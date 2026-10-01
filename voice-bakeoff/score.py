"""Objective scores for every render: speaker similarity to real Pete and word error rate.

Run with the pipeline's venv (it has pyannote + whisper):
  ../pete-tong-voice-pipeline/.venv/bin/python score.py
"""
import glob
import json
import os
import re

import numpy as np
import whisper
from dotenv import load_dotenv
from pyannote.audio import Inference, Model

from common import LINES, ROOT

load_dotenv(ROOT.parent / "pete-tong-voice-pipeline" / ".env")
emb_model = Model.from_pretrained("pyannote/wespeaker-voxceleb-resnet34-LM", token=os.environ.get("HF_TOKEN"))
embed = Inference(emb_model, window="whole")
asr = whisper.load_model("small")


def vec(path):
    v = np.asarray(embed(path)).ravel()
    return v / np.linalg.norm(v)


def words(s):
    return re.sub(r"[^a-z0-9' ]", " ", s.lower()).split()


def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


# "Real Pete" = mean embedding over all the pipeline's clean clips
real = glob.glob(str(ROOT.parent / "pete-tong-voice-pipeline/pete_tong_samples/clips/*/*.wav"))
pete = np.mean([vec(p) for p in real], axis=0)
pete /= np.linalg.norm(pete)

text = {l["id"]: l["text"] for l in LINES}
prev_path = ROOT / "out" / "scores.json"
scores = json.loads(prev_path.read_text())["renders"] if prev_path.exists() else []
seen = {(r["model"], r["ref"], r["line"]) for r in scores}
for path in sorted(glob.glob(str(ROOT / "out/*/*.wav"))):
    model = path.split("/")[-2]
    ref, line = os.path.basename(path)[:-4].split("_", 1)
    if (model, ref, line) in seen:
        continue
    heard = asr.transcribe(path, language="en")["text"].strip()
    scores.append({"model": model, "ref": ref, "line": line, "similarity": round(float(vec(path) @ pete), 3),
                   "wer": round(wer(text[line], heard), 2), "heard": heard})
    print(scores[-1])

ref_sims = {os.path.basename(p): round(float(vec(p) @ pete), 3) for p in glob.glob(str(ROOT / "refs/*.wav"))}
(ROOT / "out" / "scores.json").write_text(json.dumps({"refs": ref_sims, "renders": scores}, indent=1))
