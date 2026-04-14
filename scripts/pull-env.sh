#!/bin/bash
# Usage: ./scripts/pull-env.sh
#
# Fetches project secrets from AWS Secrets Manager and writes them to:
#   - .env in the project root for backend/local services
#   - frontend/.env.local for frontend build-time config
#
# AWS Secrets Manager stores sensitive configuration values (database URLs,
# API keys, etc.) securely in the cloud, so they never need to be committed
# to the repository.
#
# Prerequisites:
#   - AWS CLI installed (https://aws.amazon.com/cli/)
#   - Authenticated via SSO: run `aws configure sso` with profile name "default"
#     See the root README.md for full setup instructions.
#
# If the command fails with "Error loading SSO Token", your session has expired.
# Run `aws sso login --profile default` to re-authenticate.

SECRET_NAME="${SECRET_NAME}"
REGION="${REGION}"

echo "Pulling secrets from AWS Secrets Manager..."

aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --profile "default" \
  --query SecretString \
  --output text | \
  python3 -c '
import json, sys

data = json.load(sys.stdin)

with open(".env", "w") as backend_env:
    for key, value in data.items():
        backend_env.write(f"{key}={value}\n")

with open("frontend/.env.local", "w") as frontend_env:
    for key, value in data.items():
        if key.startswith("VITE_"):
            frontend_env.write(f"{key}={value}\n")
' 

echo "✅ .env file created successfully"
echo "✅ frontend/.env.local file created successfully"
