# Pete's lines

**Status:** approved by the owner, 2026-10-02. Jingles are live (ticket 09); Sign-offs and Track IDs are for tickets 13 and 14.

Every fixed line Pete says on the site (ticket 03). Each line is an original, written in his on-air style as heard in the pipeline's transcripts of five shows. None mentions the BBC, Radio 1, BBC Sounds or any show segment: no Essential Mix, Essential New Tune, Hot Mix, Club Heat Mix or Eclectic Selection.

**One rule throughout:** Pete never says "I'm Pete Tong" or "It's Pete Tong with you" as if he were the real one. Where a line names him, it winks at the AI (see Jingles 4, 6 and 8). That backs up the "AI voice, not Pete Tong" label rather than undercutting it.

Lines in the voice get rendered once and cached, so shorter is safer: the fine-tuned voice drops words more often in long sentences.

## How he actually talks (source patterns)

Phrases and patterns drawn from the transcripts, as models for the style (none of these source lines is used on the site):

- Back-announcing, newest first: "So good. It's called Wow from Hot Since 82. And before that…", "Tasty new tune from Frankie and Sandrino… It's called Rock-A-Lot. Before that, we kicked off with…", "A soulful new offering from Monkey Safari called Future."
- Energy: "We are going in. 25 minutes nonstop, back to back", "right in the middle of the mix, baby", "Turn it up", "Love it", "Tune.", "Sing along."
- Openings: "Hey, it's Pete Tong. Welcome.", "up and at it"
- Sign-off: "So until next time, all that's left for me to say is… see ya."

## 1. Jingles (desk buttons): approved

Eight buttons, replacing the old ones that referenced the BBC, Radio 1 and the Essential Mix. They're laid out in two rows of four, alternating the hype lines with the AI wordplay. The live copy, with the exact text sent to the voice, is `site/src/lib/desk/jingles.json`; `site/scripts/render-jingles.mjs` renders it.

**Saying "AI":** the voice gets "A.I." (with dots). "AI" and "A I" didn't come out right, and "A AYE" got spelled out letter by letter, since capitals read as an acronym. "HQ" is sent as "H Q".

| # | Button label | Pete says |
|---|---|---|
| 1 | Nonstop | "Nonstop, back to back. We are going in!" |
| 2 | The Legend | "The don, the legend, the machine learning master." |
| 3 | Turn It Up | "Turn it up. Go on, a little bit more. Lovely." |
| 4 | Global Dance AI | "Live from Global Dance AI. Where the beats are real, and the DJ isn't." |
| 5 | Banger | "Oh, that's a banger. Absolute banger." |
| 6 | Dance HQ | "Coming to you from Global Dance HQ. Well, a server farm somewhere." |
| 7 | In the Mix | "Right in the middle of the mix, baby." |
| 8 | Pete Tong Is AI | "Pete Tong is AI. The tunes are real. The voice? Not so much." |

Not used: "Up and At It", "White Isle", "Is AI" (replaced by #8), "Tune!" (the voice couldn't land it), the other wordplay drafts ("The don. The legend. The algorithm.", "Zeros and ones, back to back", "Up and at it, and fully charged", "Downloaded, updated, and ready to drop"), and the spares ("Hands Up", "Track ID?", "See Ya", "Sing Along"). "It's All Gone Pete Tong" is left out because it's also a film title.

## 2. Sign-offs (end of every Dedication)

Each one invites the listener to drop a playlist in the box for Track IDs. All four are used, rotating so repeat listeners hear a different one; each is pre-rendered once (ticket 14).

1. "And that's your Dedication. Got a playlist? Drop it in the box below, and I'll tell you what's playing, nonstop, back to back. Until next time… see ya."
2. "Lovely stuff. Now, if you've got a playlist, pop it in the box and I'll back-announce every tune for you. All that's left to say is… see ya."
3. "That's the one. Fancy a proper session? Drop your playlist in below, and I'll keep you posted on every track. See ya."
4. "Hope that made your day. Got more tunes? Stick a playlist in the box and let's keep it going. Until next time!"

## 3. Track IDs

Pete back-announces the last two tracks, newest first, in the pause before the next one. Each piece is rendered and cached separately, so a track's line is rendered once and reused by everyone who plays that track. `{title}` and `{artist}` come from MusicBrainz via the ISRC (ticket 13), never from Spotify's own title.

Joining separately rendered pieces sounded fine in testing (three sample Track IDs, `voice-bakeoff/out/lines-preview/`), so pieces are rendered and cached separately.

A Track ID is put together as:

**[opener]** + **[newest track: lead line]** + **[joiner]** + **[older track: follow line]**

For example: "So good." + "It's called Rock-A-Lot, from Frankie and Sandrino." + "And before that," + "Circus, from Jemi."

### 3a. Openers (no track, cached once)

- "So good."
- "Love it."
- "Tune."
- "Oh, yes."
- "What a record."
- "Big, big tune."
- "Lovely stuff."
- "Ooh, I like that."

### 3b. Lead lines (the newest track, a full sentence)

- "It's called {title}, from {artist}."
- "That's {title} from {artist}."
- "{artist} there, with {title}."
- "Tasty tune from {artist}. It's called {title}."
- "That was {artist} with {title}. Tune."
- "{title}, from {artist}. Love it."
- "Proper weapon, that. {title}, from {artist}."
- "A bit of {artist} there, with {title}."
- "{artist}, and a track called {title}."
- "That's the sound of {artist}, with {title}."

### 3c. Joiners (cached once)

- "And before that,"
- "Before that,"
- "And just before that,"
- "And ahead of that one,"

### 3d. Follow lines (the older track, after a joiner)

- "{title}, from {artist}."
- "{artist}, with {title}."
- "{title}, courtesy of {artist}."
- "we had {artist}, and {title}."
- "we kicked off with {title}, from {artist}." (only when it was the first track of the session)

### 3e. Closers (optional; one in three Track IDs gets one)

- "Nonstop, back to back."
- "We keep it moving."
- "Turn it up."
- "Here we go."
- "And we're going back in."

### 3f. Generic lines: no metadata match, or the spending cap is hit

Used when the ISRC doesn't match in MusicBrainz, or when rendering is refused because of the cap (these are all pre-rendered, so they still work then). Each has a lead form and a follow form:

| Lead (newest track) | Follow (after a joiner) |
|---|---|
| "Unreleased heat, that one. Don't ask me for the ID." | "a little something unreleased." |
| "Proper white label, that. No ID for you, I'm afraid." | "a white label I'm keeping to myself." |
| "That one's a mystery… even to me. Love it though." | "a mystery tune. Still love it." |
| "No name on that one. Just vibes." | "something with no name, just vibes." |

## 4. "Warming up the decks" captions (text on screen, not spoken)

Shown in rotation while the GPU cold-starts, which takes about a minute:

- "Warming up the decks…"
- "Cueing up the record…"
- "Pete's finding his headphones…"
- "Dusting off the needle…"
- "Finding the first beat…"
- "Nearly there: the bass is warming up…"
- "Checking the levels. One, two…"

## 5. Fixed messages (text on screen)

| Where | Text |
|---|---|
| Intro refused by the check | Pete's not saying that one. |
| Dedication removed or faded | This Dedication has faded out. Send your own. |
| Hourly Play limit hit | Pete needs a breather: try again in {minutes} minutes. |
| Spending cap hit | Pete's off air: this month's hosting budget is used up. Back next month! |
| Removed Intro re-sent | That Dedication was removed; press Play to make a new one. |

The first two are exactly as written in the tickets; the rest are what the site shows today.
