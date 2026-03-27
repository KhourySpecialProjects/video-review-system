# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────
FROM nginx:alpine

# Copy Vite build output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Required for React Router client-side routing —
# all routes fall back to index.html so the SPA handles them
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
