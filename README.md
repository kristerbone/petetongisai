# PeteTongIsAI.com

**Live site: [petetongisai.com](https://petetongisai.com)**

A DJ mixing desk web experience inspired by Pete Tong — BBC Radio 1 legend and Essential Mix host.

Fan/hobby project, built for fun. Tips cover hosting costs only; any surplus goes to charity.

## Features

- Dual spinning turntable decks with BPM nudge controls
- Animated level meters and crossfader
- Clickable EQ knobs
- 8 original Jingle buttons in Pete's (AI) voice, pre-rendered as static audio
- Play panel: Pete reads your Intro (AI voice, checked and rate-limited), then your Spotify track or playlist plays

## Roadmap

- [x] Self-hosted open voice model — Pete Tong voice clone, chosen by listening test (see `docs/adr/0002-self-hosted-open-voice-model.md`)
- [x] Spotify embeds via the iFrame API — real track playback (see `docs/adr/0001-spotify-embeds-not-playback-sdk.md`)
- [ ] Track IDs — Pete back-announces every two tracks, in lines written from his real shows
- [x] Migrate to SvelteKit on AWS (via SST)

## Running locally

The site lives in `site/` (SvelteKit + SST); see `site/README.md`.

```bash
cd site && nvm use && npm install && npm run dev
```

## Related

- `pete-tong-voice-pipeline/`: extracts clean Pete Tong speech clips from his shows
- `voice-bakeoff/`: the listening test that chose the voice model (ADR 0002)
- `voice-service/`: Pete's voice on Modal (ticket 08)
