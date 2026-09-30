# Any visitor can remove a Dedication, instantly

The site is run with zero maintenance: no moderation queue, no report button, no takedown inbox. Instead, every Dedication page carries "If this offended you, click here to remove it", and any visitor, not just the sender, can make the Dedication Fade with a single click and no confirmation, deleting its record and Intro audio at once. Unremoved Dedications Fade after 30 days (configurable) without being opened. Together these mean no clip needs us to act on it, and none stays available indefinitely unless people keep sharing it.

## Consequences

- A Dedication can be removed before its recipient hears it. This is accepted.
- Intro audio must be served with short CDN cache lifetimes (or invalidated on removal) so a removed Intro stops playing everywhere.
- Removal must need a real click (a POST), so link-preview bots can't trigger it.
- Complaints about the site as a whole (rather than one clip) arrive via the domain registrar's contact relay.
