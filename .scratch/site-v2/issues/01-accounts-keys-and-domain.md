# 01: Accounts, keys and domain

**What to build:** Get every external account and credential the build needs in place, and confirm the domain. The owner once wrote "petetonisai.com" while everything else says "petetongisai.com"; confirm which one is actually owned at GoDaddy.

**Blocked by:** None (can start immediately)

**Status:** in progress: only the GoDaddy nameserver switch is outstanding

- [x] Confirm the owned domain (petetongisai.com vs petetonisai.com) and that DNS is manageable
- [x] AWS account ready for SST deploys, with credentials available locally
- [x] Modal account created (Starter plan) and an API token available
- [x] Spotify developer app registered under the owner's Premium account; client ID and secret available
- [x] Anthropic API key available for the Intro content check
- [x] The HuggingFace token exposed in an earlier chat is rotated, and the new one is in the pipeline's local env file

## Notes

- petetongisai.com is owned at GoDaddy (renews 2027-03-15); petetonisai.com is unregistered.
- Route 53 hosted zone `Z06339582C4NOXB3DHA9G` holds the MX and SPF records copied from GoDaddy. Still to do: point GoDaddy's nameservers at ns-1180.awsdns-19.org, ns-154.awsdns-19.com, ns-934.awsdns-52.net and ns-1713.awsdns-22.co.uk.
- The `petetongisai` AWS profile signs in as the root user. Move to an IAM Identity Center user before going live.
- Site credentials are in the root `.env` (gitignored).
