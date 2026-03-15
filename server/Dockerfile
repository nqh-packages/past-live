# ─── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack (bundled with Node 22) — pin version to match local
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Install dependencies first (layer cache)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Non-root user for Cloud Run security best practice
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/logs && chown appuser:appgroup /app/logs

# Copy compiled output, assets, and production dependencies only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./dist/assets
COPY --from=builder /app/node_modules ./node_modules

USER appuser

EXPOSE 8080

ENV PORT=8080

CMD ["node", "dist/server.js"]
