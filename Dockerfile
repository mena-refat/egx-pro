# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including dev — tsx is needed at runtime)
RUN npm ci
RUN npx prisma generate

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling in containers
RUN apk add --no-cache dumb-init

# Copy node_modules and generated Prisma client
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S borsa -u 1001
RUN chown -R borsa:nodejs /app
USER borsa

EXPOSE 3000

# Use dumb-init to handle PID 1 and signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "server.ts"]
