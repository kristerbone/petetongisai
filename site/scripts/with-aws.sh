#!/usr/bin/env bash
# SST can't read `aws login` sessions yet, so hand it short-lived keys from the AWS CLI.
#   ./scripts/with-aws.sh sst deploy --stage staging
set -euo pipefail
eval "$(aws configure export-credentials --profile "${AWS_PROFILE:-petetongisai}" --format env)"
unset AWS_PROFILE
exec "$@"
