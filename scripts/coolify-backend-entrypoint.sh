#!/bin/sh
# Entrypoint for the Coolify backend image (backend/Dockerfile.coolify).
# Runs DB migrations on every boot, seeds ONLY when the database is empty (so
# redeploys preserve data and uploaded videos), then starts the server.
set -eu

echo "[entrypoint] prisma migrate deploy"
npx prisma migrate deploy

echo "[entrypoint] checking whether the database is empty"
# Count rows in the Better Auth "user" table (prisma model User -> @@map user).
# Exit 1 => empty (seed needed); 0 => already seeded; 2 => error.
set +e
node -e "import('./dist/lib/prisma.js').then(async (m) => { const n = await m.default.user.count(); process.exit(n > 0 ? 0 : 1); }).catch((e) => { console.error(e); process.exit(2); });"
STATUS=$?
set -e

if [ "$STATUS" -eq 1 ]; then
  echo "[entrypoint] database empty — running seed"
  npx prisma db seed
elif [ "$STATUS" -eq 0 ]; then
  echo "[entrypoint] database already seeded — skipping"
else
  echo "[entrypoint] seed-check failed (status $STATUS)"
  exit "$STATUS"
fi

echo "[entrypoint] starting server"
exec node dist/index.js
