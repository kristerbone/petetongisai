# voice-service

Pete's voice on Modal: the fine-tuned Chatterbox chosen in the listening test (ADR 0002), served from a Modal GPU that scales to zero (ADR 0004). See the docstring in `app.py` for commands.

- **API:** `https://krister-bone--pete-voice-api.modal.run`, served from a CPU container so it answers within a second or two while the GPU cold-starts:
  - `POST /renders` with JSON `{"text": "...", "ref": "ref4"}` (`ref` is optional) returns `202 {"id": "fc-..."}`.
  - `GET /renders/{id}` returns `202` while rendering, then `200 audio/wav`. The headers `X-Voice-Checked` (`pass`/`fail`), `X-Voice-Coverage`, `X-Voice-Ref` and `X-Voice-Render-Seconds` describe the render.
  - Either call returns `402 {"error": "budget"}` when Modal refuses work because of the spending cap. Modal doesn't document what callers see then, so `is_budget_error()` is a best guess: `ResourceExhaustedError`, or any error that mentions budget, spend limit or billing.
  - The site calls it from `site/src/lib/server/modal-voice.ts`, because a cold start (~60s) outlasts CloudFront's request timeout.
- **Auth:** a Modal proxy auth token, sent as the `Modal-Key` and `Modal-Secret` headers. Create it in the Modal dashboard (Settings → Proxy Auth Tokens). Only the site's server holds it.
- **Dropped words:** each sentence is transcribed with Whisper and scored by `check.py`. A sentence over 90 characters is rendered clause by clause (split after commas), because the model tends to stop early on long ones. A sentence below 80% coverage, or one that loses most of its last quarter, is re-rendered with a new seed (up to 3 tries), then the whole line is retried with the next Reference Clip (ref4 → ref3 → ref2). If nothing passes, the best take is returned with `X-Voice-Checked: fail`.
- **Volume `pete-voice`:** base weights in `pretrained_standard/`, the pinned adapter in `voice/chatterbox-ft-e20/`, and Reference Clips in `refs/`. Retraining with `voice-bakeoff/modal_finetune.py` writes to `output_standard/` and leaves the live voice alone. Re-run `modal run app.py::setup` to promote a new adapter.
- **Timings (L40S):** a warm two-sentence Intro takes about 5.5s. A cold start takes about 60s (26s to load the models, then a slow first render). On L4 these were 14s and 107s.
- **Tests:** run `python3 -c "import test_check as t; [getattr(t, n)() for n in dir(t) if n.startswith('test_')]"`, or use pytest.
