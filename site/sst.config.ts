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
    // Only production gets the real domain; other stages use the CloudFront URL
    const site = new sst.aws.SvelteKit("Site", {
      domain: $app.stage === "production" ? { name: DOMAIN, redirects: [`www.${DOMAIN}`] } : undefined,
    });
    return { url: site.url };
  },
});
