FROM node:20-alpine AS base

FROM base AS builder

WORKDIR /app
# Build deps for native modules (e.g., better-sqlite3 via @actual-app/api)
RUN apk add --no-cache python3 make g++ libc6-compat ca-certificates

COPY package*.json ./
# Install only production deps; skip Husky prepare in CI builds
RUN HUSKY=0 npm ci --omit=dev --no-audit --no-fund

# Copy source (context is filtered by .dockerignore)
COPY . .

FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

# Runtime needs certs for HTTPS
RUN apk add --no-cache ca-certificates

# Copy only the minimal runtime artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/config.example.yaml ./config.example.yaml
## Note: .env.example is intentionally excluded by .dockerignore
## If needed, remove the ignore or include it explicitly.

RUN mkdir -p /app/data/budget


# Default command: daemon mode
CMD ["node", "src/index.js", "--mode", "daemon"]
