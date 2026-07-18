FROM node:22-alpine AS builder

WORKDIR /repo/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY shared ../shared

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /repo/backend/package.json /repo/backend/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /repo/backend/dist/backend/src ./dist
COPY --from=builder /repo/backend/src/generated/prisma ./dist/generated/prisma
COPY --from=builder /repo/backend/prisma ./prisma

# Version metadata read at runtime by src/lib/version.ts. SOURCE_COMMIT and
# COOLIFY_BRANCH arrive as runtime env from Coolify; VERSION + BUILD_TIME are baked here.
COPY VERSION ./VERSION
RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > ./BUILD_TIME

EXPOSE 8080

CMD ["node", "dist/index.js"]