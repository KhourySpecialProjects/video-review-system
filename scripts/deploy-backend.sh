#!/bin/bash
# Usage: ./scripts/deploy-backend.sh
#
# Builds the backend Docker image, pushes it to ECR, and triggers a new
# deployment on ECS. This forces ECS to pull the latest image and replace
# the running task.
#
# Prerequisites:
#   - AWS CLI installed (https://aws.amazon.com/cli/)
#   - Docker running locally
#   - Authenticated via SSO: run `aws configure sso` with profile name "default"
#     See the root README.md for full setup instructions.
#
# If the command fails with "Error loading SSO Token", your session has expired.
# Run `aws sso login --profile default` to re-authenticate.

ECR_REPO="111372207419.dkr.ecr.us-east-1.amazonaws.com/angelman-dev-backend"
CLUSTER="angelman-dev-cluster"
SERVICE="angelman-dev-backend-task-service-a1owsalh"
REGION="us-east-1"

set -e

ACCOUNT_ID=$(echo "$ECR_REPO" | cut -d. -f1)

echo "Logging in to ECR..."
aws ecr get-login-password \
  --region "$REGION" \
  --profile "default" | \
  docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo "Building Docker image..."
docker build -t "$ECR_REPO:latest" ./backend

echo "Pushing image to ECR..."
docker push "$ECR_REPO:latest"

echo "Deploying to ECS..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --region "$REGION" \
  --profile "default" \
  --force-new-deployment \
  --no-cli-pager

echo "Deploy triggered — ECS will pull the new image and restart the task."
