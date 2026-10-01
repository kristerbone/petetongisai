"""LoRA fine-tune Chatterbox (standard or Turbo) on Pete's dataset on Modal, then render the bake-off lines.

Usage (from voice-bakeoff/, after `modal setup`):
  .venv-chatterbox/bin/modal run modal_finetune.py --mode standard
  .venv-chatterbox/bin/modal run modal_finetune.py --mode turbo --epochs 20

Training uses gokhaneraslan/chatterbox-finetuning (Apache-2.0), vendored in vendor-cbft/.
Pretrained weights, preprocessed data and adapters persist on the `pete-voice` Volume.
Renders land in out/chatterbox-ft-e<epochs>/ or out/chatterbox-turbo-ft-e<epochs>/ for build_page.py / score.py.
"""
import json
import time
from pathlib import Path

import modal

ROOT = Path(__file__).parent
TOOLKIT = "/toolkit"
VOL = "/vol"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "libsndfile1")
    .pip_install_from_requirements(str(ROOT / "vendor-cbft" / "requirements.txt"))
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "TOKENIZERS_PARALLELISM": "false"})
    .add_local_dir(ROOT / "vendor-cbft", TOOLKIT, ignore=["pretrained_models", "chatterbox_output", ".git"])
    .add_local_dir(ROOT / "dataset", "/data/dataset")
    .add_local_dir(ROOT / "refs", "/data/refs")
    .add_local_file(ROOT / "lines.json", "/data/lines.json")
)
volume = modal.Volume.from_name("pete-voice", create_if_missing=True)
app = modal.App("pete-voice-finetune", image=image)


def write_config(workdir: Path, mode: str, vocab_size: int, epochs: int, batch_size: int):
    """Point the toolkit's TrainConfig at our dataset and volume paths."""
    cfg = (workdir / "src" / "config.py").read_text()
    replacements = {
        "model_dir: str =": f'model_dir: str = "{VOL}/pretrained_{mode}"',
        "csv_path: str =": 'csv_path: str = "/data/dataset/metadata.csv"',
        "wav_dir: str =": 'wav_dir: str = "/data/dataset/wavs"',
        "preprocessed_dir =": f'preprocessed_dir = "{VOL}/preprocess_{mode}"',
        "output_dir: str =": f'output_dir: str = "{VOL}/output_{mode}"',
        "is_turbo: bool =": f"is_turbo: bool = {mode == 'turbo'}",
        "is_lora: bool =": "is_lora: bool = True",
        "new_vocab_size: int =": f"new_vocab_size: int = {vocab_size}",
        "num_epochs: int =": f"num_epochs: int = {epochs}",
        "batch_size: int =": f"batch_size: int = {batch_size}",
        "preprocess =": "preprocess = True",
    }
    lines = []
    for line in cfg.splitlines():
        stripped = line.strip()
        for prefix, new in replacements.items():
            if stripped.startswith(prefix):
                line = line[: len(line) - len(line.lstrip())] + new
                break
        lines.append(line)
    (workdir / "src" / "config.py").write_text("\n".join(lines) + "\n")


def run(cmd, cwd):
    import subprocess

    print(f"$ {cmd}")
    subprocess.run(cmd, shell=True, cwd=cwd, check=True)


@app.function(gpu="L40S", volumes={VOL: volume}, timeout=3 * 3600)
def finetune_and_render(mode: str, epochs: int, batch_size: int) -> dict:
    import os
    import re
    import shutil
    import sys

    import numpy as np
    import soundfile as sf

    workdir = Path(f"/work/{mode}")
    shutil.copytree(TOOLKIT, workdir, dirs_exist_ok=True)
    os.symlink(f"{VOL}/pretrained_{mode}", workdir / "pretrained_models") if not (workdir / "pretrained_models").exists() else None
    Path(f"{VOL}/pretrained_{mode}").mkdir(parents=True, exist_ok=True)

    # 1. Download pretrained weights (cached on the volume after the first run)
    write_config(workdir, mode, 52260 if mode == "turbo" else 2454, epochs, batch_size)
    run("python setup.py", workdir)
    vocab = 2454
    if mode == "turbo":
        from transformers import AutoTokenizer

        vocab = len(AutoTokenizer.from_pretrained(f"{VOL}/pretrained_{mode}"))
    write_config(workdir, mode, vocab, epochs, batch_size)
    volume.commit()

    # 2. Train the LoRA adapter
    t0 = time.time()
    shutil.rmtree(f"{VOL}/output_{mode}", ignore_errors=True)
    run("python train.py", workdir)
    train_s = round(time.time() - t0)
    volume.commit()

    # 3. Render every bake-off line from every reference clip with the fine-tuned model
    sys.path.insert(0, str(workdir))
    os.chdir(workdir)
    import inference

    engine = inference.load_finetuned_engine_lora("cuda")
    refs = json.loads(Path("/data/refs/refs.json").read_text())
    lines = json.loads(Path("/data/lines.json").read_text())
    renders = {}
    for ref in refs:
        prompt = f"/data/{ref['file']}"
        for line in lines:
            inference.set_seed(42)
            t = time.time()
            chunks = []
            for sent in [s for s in re.split(r"(?<=[.?!])\s+", line["text"].strip()) if s]:
                sr, audio = inference.generate_sentence_audio(engine, sent, prompt, **inference.PARAMS)
                chunks += [audio, np.zeros(int(sr * 0.2), dtype=np.float32)]
            out = Path(f"/tmp/{ref['id']}_{line['id']}.wav")
            sf.write(out, np.concatenate(chunks), sr)
            renders[out.name] = {"bytes": out.read_bytes(), "render_s": round(time.time() - t, 1)}
            print(f"rendered {out.name} in {renders[out.name]['render_s']}s")
    return {"train_s": train_s, "vocab": vocab, "renders": renders}


@app.local_entrypoint()
def main(mode: str = "standard", epochs: int = 20, batch_size: int = 16):
    assert mode in ("standard", "turbo")
    result = finetune_and_render.remote(mode, epochs, batch_size)
    name = f"{'chatterbox-ft' if mode == 'standard' else 'chatterbox-turbo-ft'}-e{epochs}"
    out_dir = ROOT / "out" / name
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for fname, r in result["renders"].items():
        (out_dir / fname).write_bytes(r["bytes"])
        ref, line = fname[:-4].split("_", 1)
        rows.append({"ref": ref, "line": line, "file": f"out/{name}/{fname}", "render_s": r["render_s"]})
    (out_dir / "results.json").write_text(json.dumps(
        {"model": name, "load_s": 0, "train_s": result["train_s"], "epochs": epochs, "gpu": "L40S (render times are GPU)",
         "renders": rows}, indent=1))
    print(f"{name}: trained in {result['train_s']}s, {len(rows)} renders saved to {out_dir}")
