# Social posts

Posts for the @petetongisai accounts on X and Instagram. Each post is one numbered file in `posts/` (`001-coming-up.json`, `002-on-air.json`, …). A post is either an animated video card (**Coming up**, **On air**, **Off air**) with Pete's synthesised voice, or a ready-made image, plus captions, and it links to a Dedication that carries another Pete Intro and plays the Spotify playlist. Every card says "Fan-made · synthesised voice".

## The flow

```bash
npm run new -- spring-mix --from 004   # 1. next numbered post (012-spring-mix.json), copied from 004
# 2. edit posts/012-spring-mix.json: captions, Pete's lines, playlist (see below)
npm run review -- 012                  # 3. read it in one place; lists what's missing
npm run preview -- 012                 # (any time) a review page: image or video, captions, intro audio
npm run dedicate -- 012                # 4. render the Dedication's Intro, to listen to
npm run dedicate -- 012 --create       # 5. make the permanent Dedication on production; link saved into the post
npm run audio -- 012                   # 6. render Pete's video line (uses a little Modal credit)
npm run export -- 012                  # 7. render the MP4s into exports/
```

Posts are picked by number (`012`) or full id (`012-spring-mix`); several can be listed, and no number means all posts. `review` exits with an error while anything is missing, so it is a checklist as well as a preview. `npm run new` without `--from` starts from a blank template: `--card up|on|off|image` picks the type.

One-off setup (needs Node and `ffmpeg`, e.g. `brew install ffmpeg`): `npm install` and `npx playwright install chromium` in this folder.

## What's in a post

`posts/NNN-name.json`. Every post has the same fields in the same order, empty ones included; after editing by hand run `npm run format` to restore that (it adds missing fields and reorders). For example `002-on-air.json`:

| Field | What it is |
|---|---|
| `card` | `up` (Coming up), `on` (On air), `off` (Off air): which animated card. Or `image`: a ready-made picture, with `image` set to its path (relative to the post file); `export` skips it and no `videoLine` is needed. |
| `platforms` | Which captions the post needs: `["x", "instagram"]`, or `["instagram"]` for no X caption. |
| `hashtags` | List, shown by `review` (Instagram's limit is 5; `review` flags more). |
| `notes` | List of things to check before posting; shown by `review`. |
| `screen` | Optional wording on the card: `sub` (the line under the title) and `ticker` (Coming up only). Leave `{}` for the defaults. |
| `videoLine` | What Pete says **in the video**, the hook. Under 200 characters. |
| `dedicationIntro` | What Pete says **in the Dedication**, the Intro people hear on the site before the music. Under 200 characters. |
| `playlist` | Optional shortcut: a key from `playlists.json` (e.g. `hot-mix-heroes`) fills in `playlistName` and `playlistUrl` below, unless you set them. |
| `playlistName` | The playlist's name, for captions and on-screen text (e.g. "Pete Tong · 13 Nov 2026"). |
| `playlistUrl` | The Spotify playlist the Dedication plays. |
| `dedicationUrl` | The permanent Dedication link. Filled in by `npm run dedicate -- <post> --create`. |
| `caption.x`, `caption.instagram` | The post text for each platform. |

In captions, and in the values of `screen` (so a card can show `"sub": "{playlistName}"`), `{dedication}`, `{playlist}`, `{playlistName}`, `{time}` and `{bbc}` are replaced from the post's fields and from `config.json` (`time`, `bbcLink`). X counts every link as 23 characters, and `review` checks the 280 limit with that in mind. Instagram captions can't hold clickable links, so they say "Link in bio": put that post's Dedication in the bio, or use a Story link sticker.

### Playlists

`playlists.json` lists the public playlists of our Spotify account ([Pete Tong Is AI](https://open.spotify.com/user/31z6eksx5qfpag7yj26cof6rdjby)), each with a short `title` (for designs and captions), the full Spotify `name` and its `url`. Set a post's `"playlist": "hot-mix-heroes"` and the name and link follow. A new playlist is one entry added by hand: Spotify's API refuses to list a user's playlists for this app (403), so there's no sync command. A post's own playlist can go straight into `playlistName` and `playlistUrl` without an entry.

### Permanent Dedications

The posts link to **permanent** Dedications: they never Fade after 30 days, and their page has no "click here to remove it" button, so a stranger can't delete a link we've posted. Visitors can't make permanent ones; only the `dedicate` command can. It uses `dedicationIntro` and `playlistUrl`, and fills in `dedicationUrl` for you:

1. `npm run dedicate` renders each Intro in Pete's voice to `audio/<post>-dedication.wav` (a post is picked up when it has a `dedicationIntro` and `playlistUrl` and no `dedicationUrl`). Nothing touches the site yet. Listen, edit the text if needed, re-run (a changed text is re-rendered; unchanged text keeps the take you heard).
2. `npm run dedicate -- 012 --create` stores that Dedication on production (AWS credentials from the `petetongisai` profile, as for `npm run deploy` in `site/`) and writes `https://petetongisai.com/d/<id>` into `dedicationUrl`. `--create` needs post numbers or `--all`, so it never makes Dedications by surprise.

Posts that already have a `dedicationUrl` are skipped, so re-running never makes duplicates. To remove one, delete its record in the production `Dedications` table (the audio goes with it). The site must be deployed with permanent-Dedication support first (`npm run deploy` in `site/`), or the pages would still show the remove button and fade after 30 days.

## Files

- `posts/`: all the posts, one numbered file each.
- `config.json`: the show `time` and `bbcLink` used by captions.
- `playlists.json`: the Spotify account's playlists.
- `instagram/`: Jennifer's draft Instagram images and original notes; posts 004 onward use her images.
- `status-animations.html`: the three CSS-animated cards. Open it to preview; the Format buttons switch between square and 9:16. `?card=up|on|off` shows one card full size.
- `preview.mjs` builds `preview/index.html` (git-ignored) for reviewing posts: open it through a local web server rooted at the repo, e.g. `http://localhost:8080/social/preview/index.html`.
- `lib.mjs`, `review.mjs`, `new-post.mjs`, `dedicate.mjs` (with `site/scripts/dedicate.mjs`), `render-audio.mjs`, `export.mjs`: the scripts behind the commands above.
- `audio/` and `exports/`: generated (git-ignored; regenerate any time).

## The videos

Each animated post renders as `exports/NNN-name-square.mp4` (1080×1080, for X and the Instagram feed) and `NNN-name-story.mp4` (1080×1920, for Reels and Stories). H.264 with AAC audio. Pete starts one second in, and the clip runs until about 2.5 seconds after he finishes (at least 12 seconds, so a ticker loop completes; `--seconds 8` lowers that). With no audio file the video is silent.

Re-render one post by naming it: `npm run export -- 002`. Audio is skipped when a file already exists, so after editing a `videoLine` name the post: `npm run audio -- 002` (or use `--force` for all). Listen to each wav before posting: the model can mangle a word even when its automatic check passes.

## Posting

Upload the square video to X, or the story video as a Reel or Story, and paste the matching caption from `npm run review`. Put the Dedication link in the X post text; on Instagram use the bio link or a Story link sticker.
