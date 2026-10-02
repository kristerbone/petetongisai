# 16: Occasion starters

**What to build:** A row of occasion chips just above the Intro box ("Need an idea? 🎂 Birthday · 💍 Wedding · …"). Tapping one fills the box with an editable starter line in Pete's dedication style, with the name slot highlighted so typing replaces it. It turns "what do I say?" into "change the name and press Play", and nudges visitors towards the joyful, inclusive uses About asks for.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Eight chips above the Intro box, in this order: 🎂 Birthday, 💍 Wedding, 💞 Anniversary, 🍻 Stag do, 🥂 Hen do, 🏢 Work do, 👋 Leaving do, ✨ Just because. They sit on two rows on a phone.
- [ ] Tapping a chip fills the box with one of its three starters, moving to the next one on each tap
- [ ] After filling, the first `[…]` slot is selected in the box, so typing replaces it
- [ ] A chip replaces the box's text only if the box is empty or still holds an unedited starter; otherwise it asks "Replace your text?" first
- [ ] While any `[…]` slot is left, Play shows "Fill in the [ ] bits first 🙂" and sends nothing, so no Play is used up
- [ ] The starters live in `site/src/lib/desk/starters.json`, next to `jingles.json`
- [ ] Dedication pages are unchanged: no chips, and the occasion isn't stored or shown

## Decisions (grilling session, 2026-10-02)

- **Purpose:** chips fill the Intro box with a starter, rather than being an inspiration-only list. Suggesting a matching track or playlist per occasion is out of scope for now.
- **Placement:** a row just above the Intro box, not down the sides of the decks: it sits next to the box it fills and works the same on a phone.
- **Occasions:** the eight above. No funerals or memorials (an AI imitation of a real person's voice at a loss could hurt), and nothing promotional (the Intro check already rejects endorsements).
- **Name slots:** `[name]` (twice for weddings and anniversaries) and `[team]` for work dos. Highlight the first slot. Play is blocked while any `[…]` is left.
- **Existing text:** a chip replaces only an empty box or an unedited starter; otherwise it asks first.
- **Voice rules:** ticket 03's rules apply (no BBC, Radio 1 or show names; no "I'm Pete Tong"). Lines stay under about 120 characters and use no ellipses, which the voice stumbles on. Stag and hen lines say "the crew" to keep them inclusive.
- **Recipient side:** the occasion doesn't travel with the Dedication (not stored, not in link previews, no themed Sign-off). The Intro already says it, and Privacy promises a minimal record. Revisit if the chips get real use.
- **No analytics:** chip use isn't counted, keeping the site's "no analytics" promise.

## Starter lines (approved by the owner, 2026-10-02)

**🎂 Birthday**
1. This one goes out to [name]. Happy birthday! Have a proper one, and turn it up.
2. Big birthday love to [name]. Another year older, still on the dancefloor.
3. Happy birthday, [name]! Hands in the air, this one's all yours.

**💍 Wedding**
1. This one goes out to [name] and [name]. Congratulations on the big day!
2. To the newlyweds, [name] and [name]. Love is in the air, and so is this tune.
3. [name] and [name], you did it! Massive congratulations. Let's get this party started.

**💞 Anniversary**
1. Happy anniversary to [name] and [name]. Still going strong, nonstop, back to back.
2. This one's for [name] and [name], celebrating another year together. Lovely stuff.
3. To [name] and [name]: happy anniversary, and here's to many more.

**🍻 Stag do**
1. This one goes out to [name] and the crew. Last night of freedom, so make it count!
2. Big shout to [name] on the stag. Behave yourselves. Or don't. Turn it up!
3. [name]'s stag do is officially open. We are going in!

**🥂 Hen do**
1. This one goes out to [name] and the crew. Hen do mode: activated!
2. Big love to [name] on the hen do. Dance like nobody's watching.
3. [name]'s hen do starts right now. Hands up, glasses up!

**🏢 Work do**
1. This one goes out to the [team] crew. Laptops closed, dancefloor open!
2. To everyone at [team]: you've earned this one. Turn it up.
3. Big shout to [team]. Work's done, now it's time to dance.

**👋 Leaving do**
1. This one goes out to [name]. Sad to see you go, but what a send-off! Good luck.
2. Farewell, [name]! New adventures await, and this one's for you.
3. [name], it won't be the same without you. Go on, one last dance.

**✨ Just because**
1. This one goes out to [name], just because. Love it.
2. For [name], who still owes me a tenner. You know who you are!
3. No reason, no occasion. This one's just for you, [name].
