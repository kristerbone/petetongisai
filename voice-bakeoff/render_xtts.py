import os
import sys
os.environ.setdefault("COQUI_TOS_AGREED", "1")  # non-commercial CPML; bake-off use only
from TTS.api import TTS
from common import run


def render(model, ref, line, out):
    model.tts_to_file(text=line["text"], speaker_wav=ref["path"], language="en", file_path=str(out))


run("xtts", lambda: TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cpu"), render, sys.argv[1:] or None)
