# ─── Stage 1: Install dependencies & build frontend ──────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files first (for layer caching)
COPY package*.json ./

# Copy workspace package.json files so npm ci resolves workspaces correctly
COPY packages/server/package.json  ./packages/server/
COPY packages/web/package.json     ./packages/web/
COPY packages/admin/package.json   ./packages/admin/
COPY packages/shared/package.json  ./packages/shared/
COPY packages/mobile/package.json  ./packages/mobile/

# Copy Prisma schema early so the server postinstall (prisma generate) can run
COPY packages/server/prisma/       ./packages/server/prisma/

# Install all workspace dependencies (hoisted to root node_modules)
RUN npm ci

# Copy full source
COPY . .

# Generate Prisma client (re-run in case postinstall used a stale schema)
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

# Build web frontend (VITE_API_URL baked in at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=@borsa/web

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling (PID 1)
RUN apk add --no-cache dumb-init

# Copy node_modules (includes generated Prisma client)
COPY --from=builder /app/node_modules ./node_modules

# Copy source (server uses tsx — runs TypeScript directly, no compile step needed)
COPY --from=builder /app/packages ./packages

# Copy root package.json so tsx can resolve "type": "module" for the workspace
COPY --from=builder /app/package.json ./package.json

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S borsa -u 1001
RUN chown -R borsa:nodejs /app
USER borsa

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
# Entry point: server package index (serves both API + built web frontend)
CMD ["node_modules/.bin/tsx", "packages/server/src/index.ts"]
