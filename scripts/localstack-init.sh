#!/bin/bash
# LocalStack init hook — runs on every container start once LocalStack is ready
# (mounted into /etc/localstack/init/ready.d/). Bootstraps the S3 bucket + CORS
# and the SES sender identity so the fully-local dev stack (LOCAL=true) works
# without any real AWS. Idempotent: safe to run on every restart.
set -euo pipefail

BUCKET="${S3_BUCKET_NAME:-angelman-videos-local}"
FROM_EMAIL="${SES_FROM_EMAIL:-no-reply@local.dev}"
FRONTEND_ORIGIN="${FRONTEND_URL:-https://localhost:5173}"

echo "[localstack-init] creating bucket: ${BUCKET}"
awslocal s3api create-bucket --bucket "${BUCKET}" >/dev/null 2>&1 || true

# The browser PUTs each multipart chunk directly to a presigned URL, so the
# bucket must allow cross-origin PUT/GET from the Vite dev origin AND expose the
# ETag response header (the client reads each part's ETag to complete the upload).
echo "[localstack-init] setting CORS on: ${BUCKET} (origin ${FRONTEND_ORIGIN})"
awslocal s3api put-bucket-cors --bucket "${BUCKET}" --cors-configuration "{
  \"CORSRules\": [
    {
      \"AllowedOrigins\": [\"${FRONTEND_ORIGIN}\"],
      \"AllowedMethods\": [\"GET\", \"PUT\", \"HEAD\"],
      \"AllowedHeaders\": [\"*\"],
      \"ExposeHeaders\": [\"ETag\"],
      \"MaxAgeSeconds\": 3000
    }
  ]
}"

# SES rejects sends from unverified identities, so verify the configured sender.
echo "[localstack-init] verifying SES sender: ${FROM_EMAIL}"
awslocal ses verify-email-identity --email-address "${FROM_EMAIL}"

echo "[localstack-init] done"
