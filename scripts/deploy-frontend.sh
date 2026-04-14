#!/bin/bash
# Usage: ./scripts/deploy-frontend.sh
#
# Builds the frontend, uploads the production build to S3, and invalidates
# CloudFront so the latest files are served.
#
# Prerequisites:
#   - AWS CLI installed (https://aws.amazon.com/cli/)
#   - Authenticated via SSO: run `aws sso login --profile default`
#   - Frontend env pulled: run `./scripts/pull-env.sh`

BUCKET="angelman-dev-frontend-111372207419"
DISTRIBUTION_ID="ED5T4T390A4QX"
REGION="us-east-1"

set -e

echo "Building frontend..."
cd frontend
npm run build

echo "Uploading build to S3..."
aws s3 sync dist/ "s3://$BUCKET" \
  --region "$REGION" \
  --profile "default" \
  --no-cli-pager \
  --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --profile "default" \
  --no-cli-pager \
  --paths "/*" \
  --query "Invalidation.[Id,Status]" \
  --output text

echo "Frontend deploy complete."
