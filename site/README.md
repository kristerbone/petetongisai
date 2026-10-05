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

Each stage needs these SST Secrets (values are in the root `.env`). Staging and production have the first three; the Spotify ones (ticket 13) still need setting on both:

```bash
npm run sst -- secret set ModalProxyTokenId <wk-…> --stage <stage>
npm run sst -- secret set ModalProxyTokenSecret <ws-…> --stage <stage>
npm run sst -- secret set AnthropicApiKey <sk-ant-…> --stage <stage>
npm run sst -- secret set SpotifyClientId <…> --stage <stage>
npm run sst -- secret set SpotifyClientSecret <…> --stage <stage>
```

`npm test` runs the unit tests. Server code that touches AWS reads linked resources through `Resource` from `sst`, so run it under `npm run sst -- shell --stage staging -- <cmd>` (or `sst dev`) rather than plain `vite dev`.

`scripts/with-aws.sh` turns the `petetongisai` AWS profile's `aws login` session into short-lived environment credentials, because SST can't read login sessions directly. If it fails, run `aws login --profile petetongisai` first.

## Layout

- `src/routes/+page.svelte`: the desk.
- `src/lib/desk/`: the On Air and Tunes lamps (`Lamps.svelte`, driven by `pete-audio.svelte.ts`), Jingles and the Play panel (`PlayPanel.svelte`, `intro.ts`). Jingles live in `jingles.json`; `node scripts/render-lines.mjs` renders new ones into `static/jingles/`, along with the Track ID pieces into `static/track-ids/` and the Sign-offs (`src/lib/dedication/sign-offs.json`) into `static/sign-offs/`.
- `src/lib/spotify/`: Spotify link parsing and the iFrame API embed.
- `src/lib/music/`: Mixcloud's widget embed, `parseMusicLink` (Spotify or Mixcloud) and `MusicPlayer`, the one player the pages hold (ADR 0005).
- `src/routes/api/intro/`: Play with text. Counts the IP's hourly limit (`lib/server/rate-limit*.ts`, DynamoDB; set per stage in `sst.config.ts`: production 10 Plays and 60 new Track ID lines an hour, other stages 1,000 for testing), checks the text with Claude Haiku (`lib/server/intro-check.ts`), renders through `../voice-service` (`lib/server/modal-voice.ts`), and holds the Intro in S3 for Send (`lib/server/intros.ts`).
- `src/routes/api/dedications/` + `src/routes/d/[id]/`: Send turns a held Intro into a Dedication (`lib/server/dedications.ts`, DynamoDB `Dedications`), and the Dedication page plays it, ending with a rotating Sign-off and a playlist box that hands the link to the desk. Any visitor can remove one (`?/remove`), and unopened ones Fade after `FADE_AFTER_DAYS` through DynamoDB TTL; `functions/fader.ts` deletes the audio whenever a record goes.
- `src/lib/track-ids/` + `src/routes/api/track-id/`: Track IDs. `session.ts` decides when Pete back-announces, `player.ts` pauses the embed and plays the pieces, and `lines.json` holds the templates and pre-rendered pieces. The server looks up each track's name from its ISRC in MusicBrainz, then Deezer (`lib/server/track-names.ts`); signed-in listeners' embeds report only the playlist, so `/api/playlist/` reads its track list from Spotify's public embed page (`lib/server/playlist.ts`) and the player matches tracks by duration and renders each track's line once for everyone (`lib/server/track-ids.ts`, DynamoDB `TrackIds`, S3 `TrackIdAudio`).
- `src/app.css`: the v1 stylesheet, used as-is.
