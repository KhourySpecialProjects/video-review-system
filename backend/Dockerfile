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

EXPOSE 8080

CMD ["node", "dist/index.js"]