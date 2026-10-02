# 15: Favicon

**What to build:** A turntable favicon for every page (desk, About, Privacy, Dedication pages), in the desk's look: an orange (#ff6b35) record and tonearm on the dark (#0d0d0d / #1a1a1a) background. It also stops the `GET /favicon.ico` 404s in the server logs.

**Blocked by:** None (can start immediately)

**Status:** done on staging

- [x] A turntable icon drawn as SVG (platter, record with a centre label, tonearm) that still reads at 16×16
- [x] `static/favicon.svg` linked from `src/app.html`, plus a `favicon.ico` fallback (32×32) for browsers and bots that request `/favicon.ico` directly
- [x] A 180×180 `apple-touch-icon.png`, so a shared Dedication saved to a phone's home screen has the icon too
- [x] Icons served with the right content types and a long cache (add `fileOptions` in `sst.config.ts` if SST's type lookup misses `.ico`/`.svg`, as it did for `.mp3`)
- [x] No more `/favicon.ico` 404s in the staging server logs

## Notes

- `site/static/favicon.svg` is the source. `favicon.ico` (32×32) and `apple-touch-icon.png` (180×180) were rasterised from it with headless Chrome, and ffmpeg wrote the `.ico`. Redo both if the SVG changes.
- Right after a deploy, new root-level static files 404 at CloudFront for about 25s until SST's routing catches up. That's expected, not a bug.
