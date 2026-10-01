# voice-service

Pete's voice on Modal: the fine-tuned Chatterbox chosen in the listening test (ADR 0002), served from a Modal GPU that scales to zero (ADR 0004). See the docstring in `app.py` for commands.

- **Endpoint:** `POST https://krister-bone--pete-voice-voice-speak.modal.run` with JSON `{"text": "...", "ref": "ref4"}` (`ref` is optional). It returns `audio/wav`. The response headers `X-Voice-Checked` (`pass`/`fail`), `X-Voice-Coverage`, `X-Voice-Ref` and `X-Voice-Render-Seconds` describe the render.
- **Auth:** a Modal proxy auth token, sent as the `Modal-Key` and `Modal-Secret` headers. Create it in the Modal dashboard (Settings → Proxy Auth Tokens). Only the site's server holds it.
- **Dropped words:** each sentence is transcribed with Whisper and scored by `check.py`. A sentence below 80% coverage is re-rendered with a new seed (up to 3 tries), then the whole line is retried with the next Reference Clip (ref4 → ref3 → ref2). If nothing passes, the best take is returned with `X-Voice-Checked: fail`.
- **Volume `pete-voice`:** base weights in `pretrained_standard/`, the pinned adapter in `voice/chatterbox-ft-e20/`, and Reference Clips in `refs/`. Retraining with `voice-bakeoff/modal_finetune.py` writes to `output_standard/` and leaves the live voice alone. Re-run `modal run app.py::setup` to promote a new adapter.
- **Timings (L40S):** a warm two-sentence Intro takes about 5.5s. A cold start takes about 60s (26s to load the models, then a slow first render). On L4 these were 14s and 107s.
- **Tests:** run `python3 -c "import test_check as t; [getattr(t, n)() for n in dir(t) if n.startswith('test_')]"`, or use pytest.
