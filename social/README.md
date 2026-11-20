# Social posts

Posts for the @petetongisai accounts on X and Instagram, one set per Friday show. Each post is a short video (an animated **Coming up**, **On air** or **Off air** card with Pete's synthesised voice on it) plus captions, and it links to a Dedication that carries another Pete Intro and plays the Spotify playlist. Every card says "Fan-made · synthesised voice".

## The weekly flow

```bash
npm run new -- 2026-11-27     # 1. copy last show's posts as a starting point, links cleared
# 2. edit posts/2026-11-27/*.json: captions, Pete's lines, playlist links (see below)
npm run review -- 2026-11-27  # 3. read everything in one place; lists what's missing
npm run dedicate -- 2026-11-27           # 4. render each Dedication's Intro, to listen to
npm run dedicate -- 2026-11-27 --create  # 5. make the permanent Dedications on production; links saved into the posts
npm run audio -- 2026-11-27   # 6. render Pete's video lines (uses a little Modal credit)
npm run export -- 2026-11-27  # 7. render the MP4s into exports/2026-11-27/
```

Leave the show out of any command to use the newest one. `review` exits with an error while anything is missing, so it is a checklist as well as a preview.

One-off setup (needs Node and `ffmpeg`, e.g. `brew install ffmpeg`): `npm install` and `npx playwright install chromium` in this folder.

## What's in a post

`posts/<show date>/NN-name.json`, shown in order. For example `01-coming-up.json`:

| Field | What it is |
|---|---|
| `card` | `up` (Coming up), `on` (On air) or `off` (Off air): which animated card. |
| `screen` | Optional wording on the card: `sub` (the line under the title) and `ticker` (Coming up only). Leave `{}` for the defaults. |
| `videoLine` | What Pete says **in the video**, the hook. Under 200 characters. |
| `dedicationIntro` | What Pete says **in the Dedication**, the Intro people hear on the site before the music. Under 200 characters. |
| `playlist` | Optional shortcut: a key from `playlists.json` (e.g. `hot-mix-heroes`) fills in `playlistName` and `playlistUrl` below, unless you set them. |
| `playlistName` | The playlist's name, for captions and on-screen text (e.g. "Pete Tong · 13 Nov 2026"). |
| `playlistUrl` | The Spotify playlist the Dedication plays. |
| `dedicationUrl` | The permanent Dedication link. Filled in by `npm run dedicate -- --create`. |
| `caption.x`, `caption.instagram` | The post text for each platform. |

In captions, and in the values of `screen` (so a card can show `"sub": "{playlistName}"`), `{dedication}`, `{playlist}`, `{playlistName}`, `{time}` and `{bbc}` are replaced from the post's links and from `posts/<show>/show.json` (`time`, `bbcLink`). X counts every link as 23 characters, and `review` checks the 280 limit with that in mind. Instagram captions can't hold clickable links, so they say "Link in bio": put that post's Dedication in the bio, or use a Story link sticker.

### Playlists

`playlists.json` lists the public playlists of our Spotify account ([Pete Tong Is AI](https://open.spotify.com/user/31z6eksx5qfpag7yj26cof6rdjby)), each with a short `title` (for designs and captions), the full Spotify `name` and its `url`. Set a post's `"playlist": "hot-mix-heroes"` and the name and link follow. A new playlist is one entry added by hand: Spotify's API refuses to list a user's playlists for this app (403), so there's no sync command. A show's own playlist can go straight into `playlistName` and `playlistUrl` without an entry.

### Permanent Dedications

The posts link to **permanent** Dedications: they never Fade after 30 days, and their page has no "click here to remove it" button, so a stranger can't delete a link we've posted. Visitors can't make permanent ones; only the `dedicate` command can. It uses `dedicationIntro` and `playlistUrl`, and fills in `dedicationUrl` for you:

1. `npm run dedicate` renders each Intro in Pete's voice to `audio/<show>/<post>-dedication.wav` (a post is picked up when it has a `dedicationIntro` and `playlistUrl` and no `dedicationUrl`). Nothing touches the site yet. Listen, edit the text if needed, re-run (a changed text is re-rendered; unchanged text keeps the take you heard).
2. `npm run dedicate -- --create` stores each Dedication on production (AWS credentials from the `petetongisai` profile, as for `npm run deploy` in `site/`) and writes `https://petetongisai.com/d/<id>` into `dedicationUrl`.

Posts that already have a `dedicationUrl` are skipped, so re-running never makes duplicates. To remove one, delete its record in the production `Dedications` table (the audio goes with it). The site must be deployed with permanent-Dedication support first (`npm run deploy` in `site/`), or the pages would still show the remove button and fade after 30 days.

## Files

- `posts/`: all the post text, one folder per show.
- `status-animations.html`: the three CSS-animated cards. Open it to preview; the Format buttons switch between square and 9:16. `?card=up|on|off` shows one card full size.
- `lib.mjs`, `review.mjs`, `new-show.mjs`, `dedicate.mjs` (with `site/scripts/dedicate.mjs`), `render-audio.mjs`, `export.mjs`: the scripts behind the commands above.
- `audio/<show>/` and `exports/<show>/`: generated (git-ignored; regenerate any time).

## The videos

Each post renders as `exports/<show>/NN-name-square.mp4` (1080×1080, for X and the Instagram feed) and `NN-name-story.mp4` (1080×1920, for Reels and Stories). H.264 with AAC audio. Pete starts one second in, and the clip runs until about 2.5 seconds after he finishes (at least 12 seconds, so a ticker loop completes; `--seconds 8` lowers that). With no audio file the video is silent.

Re-render a single post by naming it: `npm run export -- 2026-11-27 02-on-air`. Audio is skipped when a file already exists, so after editing a `videoLine` re-run with `--force` or the post name: `npm run audio -- 2026-11-27 02-on-air`. Listen to each wav before posting: the model can mangle a word even when its automatic check passes.

## Posting

Upload the square video to X, or the story video as a Reel or Story, and paste the matching caption from `npm run review`. Put the Dedication link in the X post text; on Instagram use the bio link or a Story link sticker.
