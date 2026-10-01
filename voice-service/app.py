"""Pete's voice on Modal: fine-tuned Chatterbox (ADR 0002) behind a token-protected web endpoint (ADR 0004).

Usage (from voice-service/, with any venv that has `modal`, e.g. ../voice-bakeoff/.venv-chatterbox):
  modal run app.py::setup                        # once: pin the adapter + upload Reference Clips to the Volume
  modal run app.py::main --text "Pete Tong with you."  # render one line straight from the CLI -> out.wav
  modal deploy app.py                            # publish the web endpoint

The endpoint is POST {"text": "...", "ref": "ref4"?} -> audio/wav. It requires a Modal proxy auth token
(Modal-Key / Modal-Secret headers), which only the site's server holds. Each sentence is checked with
Whisper; dropped words trigger a re-render, then a retry with the next Reference Clip.
"""
import io
import time
from pathlib import Path

import modal

HERE = Path(__file__).parent
VOL = "/vol"
TOOLKIT = "/toolkit"
TOOLKIT_COMMIT = "fac31c46ec96b37283a363a1a96c2a0e56640e03"  # gokhaneraslan/chatterbox-finetuning, Apache-2.0
ADAPTER = f"{VOL}/voice/chatterbox-ft-e20"  # pinned copy; retraining writes to output_standard, not here
REFS = ["ref4", "ref3", "ref2"]  # fewest dropped words in the bake-off first
ATTEMPTS_PER_SENTENCE = 3

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "libsndfile1")
    .run_commands(
        f"git clone https://github.com/gokhaneraslan/chatterbox-finetuning {TOOLKIT}",
        f"cd {TOOLKIT} && git checkout {TOOLKIT_COMMIT}",
        f"pip install -r {TOOLKIT}/requirements.txt",
    )
    .pip_install("openai-whisper==20250625", "fastapi[standard]")
    .run_commands(
        "python -c \"import whisper; whisper.load_model('small', device='cpu')\"",
        # The toolkit's silence trim pulls Silero VAD via torch.hub; fetch it at build, not on every cold start
        "python -c \"import torch; torch.hub.load('snakers4/silero-vad', 'silero_vad', trust_repo=True)\"",
    )
    .env({"TOKENIZERS_PARALLELISM": "false"})
    .add_local_python_source("check")
)
volume = modal.Volume.from_name("pete-voice")
app = modal.App("pete-voice", image=image)


# L40S: ~5.5s per warm two-sentence Intro vs ~14s on L4, at about the same cost per render
@app.cls(gpu="L40S", volumes={VOL: volume}, scaledown_window=300, max_containers=1, timeout=180)
class Voice:
    @modal.enter()
    def load(self):
        import os
        import sys

        import whisper

        # The toolkit reads its paths relative to its own directory (src/config.py defaults)
        for link, target in [("pretrained_models", f"{VOL}/pretrained_standard"), ("chatterbox_output", ADAPTER)]:
            if not os.path.lexists(f"{TOOLKIT}/{link}"):
                os.symlink(target, f"{TOOLKIT}/{link}")
        os.chdir(TOOLKIT)
        sys.path.insert(0, TOOLKIT)
        import inference

        t0 = time.time()
        self.inference = inference
        self.engine = inference.load_finetuned_engine_lora("cuda")
        self.asr = whisper.load_model("small", device="cuda")
        print(f"loaded in {time.time() - t0:.1f}s")

    def _sentence(self, text: str, ref: str, seed: int):
        import librosa

        from check import coverage

        self.inference.set_seed(seed)
        sr, audio = self.inference.generate_sentence_audio(
            self.engine, text, f"{VOL}/refs/{ref}.wav", **self.inference.PARAMS
        )
        if len(audio) == 0:
            return audio, sr, 0.0, ""
        heard = self.asr.transcribe(librosa.resample(audio, orig_sr=sr, target_sr=16000), language="en", fp16=True)
        return audio, sr, coverage(text, heard["text"]), heard["text"].strip()

    def _line(self, text: str, ref: str) -> dict:
        """Render each sentence, re-rendering any that drop words. Keeps the best take of each."""
        from check import MIN_COVERAGE, sentences

        takes = []
        for sent in sentences(text):
            best = None
            for attempt in range(ATTEMPTS_PER_SENTENCE):
                audio, sr, cov, heard = self._sentence(sent, ref, seed=42 + attempt)
                print(f"[{ref} #{attempt}] {cov:.2f} {sent!r} -> {heard!r}")
                if best is None or cov > best["coverage"]:
                    best = {"audio": audio, "sr": sr, "coverage": cov}
                if cov >= MIN_COVERAGE:
                    break
            takes.append(best)
        return {"ref": ref, "takes": takes, "coverage": min(t["coverage"] for t in takes)}

    @modal.method()
    def render(self, text: str, ref: str | None = None) -> dict:
        import numpy as np
        import soundfile as sf

        from check import MIN_COVERAGE

        t0 = time.time()
        best = None
        for r in [ref] if ref else REFS:
            line = self._line(text, r)
            if best is None or line["coverage"] > best["coverage"]:
                best = line
            if line["coverage"] >= MIN_COVERAGE:
                break
        sr = best["takes"][0]["sr"]
        gap = np.zeros(int(sr * 0.2), dtype=np.float32)
        audio = np.concatenate([x for t in best["takes"] for x in (t["audio"], gap)])
        buf = io.BytesIO()
        sf.write(buf, audio, sr, format="WAV")
        return {
            "wav": buf.getvalue(),
            "ref": best["ref"],
            "coverage": round(best["coverage"], 2),
            "checked": best["coverage"] >= MIN_COVERAGE,
            "render_s": round(time.time() - t0, 1),
        }

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def speak(self, body: dict):
        from fastapi import HTTPException, Response

        text = (body.get("text") or "").strip()
        ref = body.get("ref")
        if not text or len(text) > 400:
            raise HTTPException(400, "text must be 1-400 characters")
        if ref is not None and ref not in REFS:
            raise HTTPException(400, f"ref must be one of {REFS}")
        out = self.render.local(text, ref)
        return Response(
            out["wav"],
            media_type="audio/wav",
            headers={
                "X-Voice-Ref": out["ref"],
                "X-Voice-Coverage": str(out["coverage"]),
                "X-Voice-Checked": "pass" if out["checked"] else "fail",
                "X-Voice-Render-Seconds": str(out["render_s"]),
            },
        )


@app.function(volumes={VOL: volume}, timeout=600)
def pin_assets(refs: dict[str, bytes]):
    import shutil

    shutil.copytree(f"{VOL}/output_standard/new_lang_adapter", f"{ADAPTER}/new_lang_adapter", dirs_exist_ok=True)
    Path(f"{VOL}/refs").mkdir(exist_ok=True)
    for name, data in refs.items():
        Path(f"{VOL}/refs/{name}.wav").write_bytes(data)
    volume.commit()
    print(f"adapter pinned at {ADAPTER}; refs: {sorted(refs)}")


@app.local_entrypoint()
def setup():
    refs_dir = HERE.parent / "voice-bakeoff" / "refs"
    pin_assets.remote({r: (refs_dir / f"{r}.wav").read_bytes() for r in REFS})


@app.local_entrypoint()
def main(
    text: str = "Pete Tong with you. Nonstop, back to back, all night long. Let's go!",
    ref: str = "",
    out: str = "out.wav",
    gpu: str = "",
    repeat: int = 1,
):
    """--gpu tries another GPU type; --repeat > 1 renders again in the same (now warm) container."""
    voice = Voice.with_options(gpu=gpu)() if gpu else Voice()
    for i in range(repeat):
        t0 = time.time()
        result = voice.render.remote(text, ref or None)
        Path(out).write_bytes(result.pop("wav"))
        print(f"{out} #{i}: {result} wall={time.time() - t0:.1f}s")
