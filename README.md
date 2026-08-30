# PeteTongIsAI.com

A DJ mixing desk web experience inspired by Pete Tong — BBC Radio 1 legend and Essential Mix host.

Fan/hobby project. No commercial intent.

## Features (v1)

- Dual spinning turntable decks with BPM nudge controls
- Animated level meters and crossfader
- Clickable EQ knobs
- 8 jingle buttons with Pete Tong catchphrases (browser TTS)
- Custom text-to-speech voice box — type anything, Pete says it
- Mocked Spotify player UI (real SDK integration pending)

## Roadmap

- [ ] ElevenLabs voice API — Pete Tong voice clone
- [ ] Spotify Web Playback SDK — real track playback
- [ ] AI track introductions from track metadata (Claude API)
- [ ] Migrate to Svelte + Vite

## Running locally

Just open `index.html` in a browser. No build step needed for v1.

```bash
open index.html
# or
python -m http.server 8080
```

## API integration slots

### ElevenLabs

In `app.js`, replace `speakText()` with the stubbed `speakTextElevenLabs()` function.
Set your voice ID and API key.

### Spotify

Replace `mockSpotifyConnect()` in `app.js` with real OAuth flow + Web Playback SDK init.
Requires Spotify Premium on the user's account.

## Related

- `pete-tong-voice-pipeline/` — automated pipeline to extract Pete Tong voice samples for ElevenLabs training
