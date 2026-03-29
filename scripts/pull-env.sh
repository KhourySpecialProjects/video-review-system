#!/bin/bash
# Usage: ./scripts/pull-env.sh
# Pulls secrets from AWS Secrets Manager and writes them to a local .env file

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