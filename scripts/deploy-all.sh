#!/bin/bash
# Usage: ./scripts/deploy-all.sh
#
# Pulls the latest env files, deploys the backend, and deploys the frontend.

set -e

./scripts/pull-env.sh
./scripts/deploy-backend.sh
./scripts/deploy-frontend.sh
