# 04: Walking skeleton: SvelteKit on AWS

**What to build:** The current desk (decks, meters, EQ knobs, Jingle buttons, voice box) running as a SvelteKit app deployed to AWS with SST at a real URL. Behaviour is unchanged: browser text-to-speech still speaks. This is the prefactor every later ticket builds on.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] SvelteKit project deployed via SST to AWS; a single command deploys it
- [ ] The desk looks and behaves as the current static site does
- [ ] Served on the confirmed domain (or a staging subdomain) over HTTPS
- [ ] The old static files and ElevenLabs/Spotify-SDK stubs are removed or retired
