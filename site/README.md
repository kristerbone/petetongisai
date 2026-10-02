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

Each stage needs these SST Secrets (values are in the root `.env`); staging and production are set:

```bash
npm run sst -- secret set ModalProxyTokenId <wk-…> --stage <stage>
npm run sst -- secret set ModalProxyTokenSecret <ws-…> --stage <stage>
npm run sst -- secret set AnthropicApiKey <sk-ant-…> --stage <stage>
```

`npm test` runs the unit tests. Server code that touches AWS reads linked resources through `Resource` from `sst`, so run it under `npm run sst -- shell --stage staging -- <cmd>` (or `sst dev`) rather than plain `vite dev`.

`scripts/with-aws.sh` turns the `petetongisai` AWS profile's `aws login` session into short-lived environment credentials, because SST can't read login sessions directly. If it fails, run `aws login --profile petetongisai` first.

## Layout

- `src/routes/+page.svelte`: the desk.
- `src/lib/desk/`: decks, mixer, Jingles (still browser text-to-speech) and the Play panel (`PlayPanel.svelte`, `intro.ts`).
- `src/lib/spotify/`: Spotify link parsing and the iFrame API embed.
- `src/routes/api/intro/`: Play with text. Counts the IP's hourly limit (`lib/server/rate-limit*.ts`, DynamoDB), checks the text with Claude Haiku (`lib/server/intro-check.ts`), renders through `../voice-service` (`lib/server/modal-voice.ts`), and holds the Intro in S3 for Send (`lib/server/intros.ts`).
- `src/routes/api/dedications/` + `src/routes/d/[id]/`: Send turns a held Intro into a Dedication (`lib/server/dedications.ts`, DynamoDB `Dedications`), and the Dedication page plays it.
- `src/app.css`: the v1 stylesheet, used as-is.
