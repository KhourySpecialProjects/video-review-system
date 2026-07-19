# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
COPY shared ../shared
ARG VITE_APP_ENV=""
ENV VITE_APP_ENV=$VITE_APP_ENV
# Telemetry build args (Vite bakes VITE_* at build time from process.env, so each
# must be ARG + ENV here — a compose build.arg alone is invisible to the build).
# Empty DSN disables telemetry; privacy defaults to scrubbed (fail-safe).
ARG VITE_GLITCHTIP_DSN=""
ENV VITE_GLITCHTIP_DSN=$VITE_GLITCHTIP_DSN
ARG VITE_TELEMETRY_PRIVACY="scrubbed"
ENV VITE_TELEMETRY_PRIVACY=$VITE_TELEMETRY_PRIVACY
# Version metadata. SOURCE_COMMIT (requires Coolify "Include Source Commit in
# Build") and COOLIFY_BRANCH arrive as build args; VERSION is copied from the
# repo root. Vite bakes VITE_APP_* from process.env at build time.
ARG SOURCE_COMMIT=""
ARG COOLIFY_BRANCH=""
COPY VERSION ./VERSION
RUN VITE_APP_VERSION_BASE="$(cat ./VERSION)" \
    VITE_APP_COMMIT="$SOURCE_COMMIT" \
    VITE_APP_BRANCH="$COOLIFY_BRANCH" \
    VITE_APP_BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────
FROM nginx:alpine

# Copy Vite build output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Required for React Router client-side routing —
# all routes fall back to index.html so the SPA handles them
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]