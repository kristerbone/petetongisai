import sys
from f5_tts.api import F5TTS
from common import run


def render(model, ref, line, out):
    model.infer(ref_file=ref["path"], ref_text=ref["text"], gen_text=line["text"], file_wave=str(out))


run("f5", lambda: F5TTS(), render, sys.argv[1:] or None)
