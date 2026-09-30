# PeteTongIsAI.com

A DJ mixing desk web experience inspired by Pete Tong — BBC Radio 1 legend and Essential Mix host.

Fan/hobby project, built for fun. Tips cover hosting costs only; any surplus goes to charity.

## Features (v1)

- Dual spinning turntable decks with BPM nudge controls
- Animated level meters and crossfader
- Clickable EQ knobs
- 8 jingle buttons with Pete Tong catchphrases (browser TTS)
- Custom text-to-speech voice box — type anything, Pete says it
- Mocked Spotify player UI (real SDK integration pending)

## Roadmap

- [ ] Self-hosted open voice model — Pete Tong voice clone, chosen by listening test (see `docs/adr/0002-self-hosted-open-voice-model.md`)
- [ ] Spotify embeds via the iFrame API — real track playback (see `docs/adr/0001-spotify-embeds-not-playback-sdk.md`)
- [ ] Track IDs — Pete back-announces every two tracks, in lines written from his real shows
- [ ] Migrate to SvelteKit on AWS (via SST)

## Running locally

Just open `index.html` in a browser. No build step needed for v1.

```bash
open index.html
# or
python -m http.server 8080
```

## API integration slots

### Voice

`speakText()` in `app.js` is where synthesised audio replaces browser TTS. The ElevenLabs stub there is superseded — see `docs/adr/0002-self-hosted-open-voice-model.md`.

### Spotify

Replace `mockSpotifyConnect()` in `app.js` with Spotify embeds driven by the iFrame API (no OAuth, no Premium requirement). See `docs/adr/0001-spotify-embeds-not-playback-sdk.md`.

## Related

- `pete-tong-voice-pipeline/` — automated pipeline to extract Pete Tong voice samples for ElevenLabs training
