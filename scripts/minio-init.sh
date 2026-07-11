#!/bin/sh
# One-shot MinIO bootstrap for the Coolify deploy. Runs in a minio/mc container
# after MinIO starts. Waits for MinIO to accept connections, then creates the
# (private) bucket. Idempotent — safe on every deploy. CORS/ETag are handled by
# the MinIO server via MINIO_API_CORS_ALLOW_ORIGIN (see docker-compose.coolify.yml);
# the bucket stays private because all access is via presigned URLs.
set -eu

ENDPOINT="${MINIO_INTERNAL_ENDPOINT:-http://minio:9000}"
BUCKET="${S3_BUCKET_NAME:-angelman-videos-develop}"

echo "[minio-init] waiting for MinIO at ${ENDPOINT}"
i=0
until mc alias set target "${ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[minio-init] MinIO did not become ready in time"
    exit 1
  fi
  sleep 2
done

echo "[minio-init] creating bucket (if absent): ${BUCKET}"
mc mb --ignore-existing "target/${BUCKET}"

echo "[minio-init] done"
