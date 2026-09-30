# Modal for text-to-speech, AWS for everything else

The site, API, Dedication records and stored audio live on AWS, but text-to-speech runs on Modal's serverless GPUs, called from AWS. AWS offers no GPU that both scales to zero and starts quickly: Lambda has no GPUs, SageMaker Async Inference takes minutes to wake from zero (and a sender waits on the Intro when pressing Play), and an always-on GPU instance would cost far more than donations for hosting could cover. Modal bills per second only while running (an L4 is about $0.80/hour) and its free monthly credit likely covers a hobby site's volume.

## Consequences

- The first Intro after a quiet spell waits for a cold start (roughly 10–30s), so Play needs a "warming up the decks" state.
- Track IDs are generated while tracks play and stored, so they never wait on a cold start.
- Two providers, two accounts and an API key between them.
