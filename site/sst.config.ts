/// <reference path="./.sst/platform/config.d.ts" />

const DOMAIN = "petetongisai.com";
// A Dedication nobody opens for this long Fades (ADR 0003)
const FADE_AFTER_DAYS = "30";

export default $config({
  app(input) {
    return {
      name: "petetongisai",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      // Credentials come from scripts/with-aws.sh (npm run deploy), not a profile
      providers: { aws: { region: "eu-west-2" } },
    };
  },
  async run() {
    // Set per stage: npm run sst -- secret set ModalProxyTokenId <value> --stage <stage>
    const modalTokenId = new sst.Secret("ModalProxyTokenId");
    const modalTokenSecret = new sst.Secret("ModalProxyTokenSecret");
    const anthropicKey = new sst.Secret("AnthropicApiKey");
    // App-only Spotify credentials, for looking up a track's ISRC (ticket 13)
    const spotifyClientId = new sst.Secret("SpotifyClientId");
    const spotifyClientSecret = new sst.Secret("SpotifyClientSecret");

    // Play-with-text hits per IP (ticket 10); items expire on their own
    const rateLimits = new sst.aws.Dynamo("RateLimits", {
      fields: { key: "string" },
      primaryIndex: { hashKey: "key" },
      ttl: "expires",
    });
    // Dedications (ticket 11), plus "intro#<render id>" claims so each Intro is sent at most once
    const dedications = new sst.aws.Dynamo("Dedications", {
      fields: { id: "string" },
      primaryIndex: { hashKey: "id" },
      ttl: "fadesAt",
      stream: "old-image",
    });
    // Rendered Intros: intros/ is held an hour for Send; dedications/ keeps each Dedication's copy
    const intros = new sst.aws.Bucket("Intros", {
      lifecycle: [{ id: "expire-intros", prefix: "intros/", expiresIn: "1 day" }],
    });

    // Track IDs (ticket 13): "name#<track>" holds a track's MusicBrainz name (a miss expires to be
    // retried); "line#<track>#<form>" says whether its line is ready or which render to collect
    const trackIds = new sst.aws.Dynamo("TrackIds", {
      fields: { key: "string" },
      primaryIndex: { hashKey: "key" },
      ttl: "expires",
    });
    // Each track's rendered line, kept for everyone who plays it
    const trackIdAudio = new sst.aws.Bucket("TrackIdAudio");

    // Whenever a Dedication record goes (removed, or faded by TTL), delete its audio too
    dedications.subscribe(
      "Fader",
      { handler: "functions/fader.handler", link: [intros] },
      { filters: [{ eventName: ["REMOVE"] }] },
    );

    // Only production gets the real domain; other stages use the CloudFront URL
    const site = new sst.aws.SvelteKit("Site", {
      link: [anthropicKey, spotifyClientId, spotifyClientSecret, rateLimits, intros, dedications, trackIds, trackIdAudio],
      // SST's type lookup doesn't know .mp3, and Safari won't play audio served as octet-stream
      assets: {
        fileOptions: [
          { files: "jingles/*.mp3", contentType: "audio/mpeg", cacheControl: "public,max-age=3600,s-maxage=86400" },
          { files: "track-ids/*.mp3", contentType: "audio/mpeg", cacheControl: "public,max-age=3600,s-maxage=86400" },
        ],
      },
      environment: {
        MODAL_VOICE_URL: "https://krister-bone--pete-voice-api.modal.run",
        MODAL_PROXY_TOKEN_ID: modalTokenId.value,
        MODAL_PROXY_TOKEN_SECRET: modalTokenSecret.value,
        FADE_AFTER_DAYS,
      },
      domain: $app.stage === "production" ? { name: DOMAIN, redirects: [`www.${DOMAIN}`] } : undefined,
    });
    return { url: site.url };
  },
});
