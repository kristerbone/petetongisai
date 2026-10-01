import sys
import torch
import torchaudio as ta
from chatterbox.tts_turbo import ChatterboxTurboTTS
from common import run

device = "mps" if torch.backends.mps.is_available() else "cpu"


def render(model, ref, line, out):
    wav = model.generate(line["text"], audio_prompt_path=ref["path"])
    ta.save(str(out), wav, model.sr)


run("chatterbox-turbo", lambda: ChatterboxTurboTTS.from_pretrained(device=device), render, sys.argv[1:] or None)
