/// <reference path="./.sst/platform/config.d.ts" />

const DOMAIN = "petetongisai.com";

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
    });
    // Rendered Intros: intros/ is held an hour for Send; dedications/ keeps each Dedication's copy
    const intros = new sst.aws.Bucket("Intros", {
      lifecycle: [{ id: "expire-intros", prefix: "intros/", expiresIn: "1 day" }],
    });

    // Only production gets the real domain; other stages use the CloudFront URL
    const site = new sst.aws.SvelteKit("Site", {
      link: [anthropicKey, rateLimits, intros, dedications],
      environment: {
        MODAL_VOICE_URL: "https://krister-bone--pete-voice-api.modal.run",
        MODAL_PROXY_TOKEN_ID: modalTokenId.value,
        MODAL_PROXY_TOKEN_SECRET: modalTokenSecret.value,
      },
      domain: $app.stage === "production" ? { name: DOMAIN, redirects: [`www.${DOMAIN}`] } : undefined,
    });
    return { url: site.url };
  },
});
