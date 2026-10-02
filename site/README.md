# site

The petetongisai.com desk: SvelteKit 2 (Svelte 5), deployed to AWS (eu-west-2) with SST.

```bash
nvm use            # Node 24, see .nvmrc
npm install
npm run dev        # http://localhost:5173
npm run check      # type-check
```

## Deploying

```bash
npm run deploy:staging   # CloudFront URL, no custom domain
npm run deploy           # production stage on petetongisai.com (needs Route 53 to be live for the domain)
npm run sst -- remove --stage staging
```

Each stage needs the Modal proxy token as SST Secrets (values are in the root `.env`):

```bash
npm run sst -- secret set ModalProxyTokenId <wk-…> --stage production
npm run sst -- secret set ModalProxyTokenSecret <ws-…> --stage production
```

`scripts/with-aws.sh` turns the `petetongisai` AWS profile's `aws login` session into short-lived environment credentials, because SST can't read login sessions directly. If it fails, run `aws login --profile petetongisai` first.

## Layout

- `src/routes/+page.svelte`: the desk.
- `src/lib/desk/`: decks, mixer, jingles, voice box and the mock Spotify player (ticket 06 replaces the mock).
- `src/lib/desk/voice.ts`: `speakAsPete()` starts a render at `/api/speak` and polls it; `speak()` (browser text-to-speech) remains for the Jingles.
- `src/routes/api/speak/`: server routes that call `../voice-service` with the Modal proxy token (`src/lib/server/modal-voice.ts`).
- `src/app.css`: the v1 stylesheet, used as-is.
