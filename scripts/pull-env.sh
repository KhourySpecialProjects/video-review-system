#!/bin/bash
# Usage: ./scripts/pull-env.sh
#
# Fetches project secrets from AWS Secrets Manager and writes them to a .env file
# in the project root. AWS Secrets Manager is a service that stores sensitive
# configuration values (database URLs, API keys, etc.) securely in the cloud,
# so they never need to be committed to the repository.
#
# Prerequisites:
#   - AWS CLI installed (https://aws.amazon.com/cli/)
#   - Authenticated via SSO: run `aws configure sso` with profile name "default"
#     See the root README.md for full setup instructions.
#
# If the command fails with "Error loading SSO Token", your session has expired.
# Run `aws sso login --profile default` to re-authenticate.

SECRET_NAME="dev/backend"
REGION="us-east-1"

echo "Pulling secrets from AWS Secrets Manager..."

aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --profile "default" \
  --query SecretString \
  --output text | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for k, v in data.items():
    print(f'{k}={v}')
" > .env

echo "✅ .env file created successfully"