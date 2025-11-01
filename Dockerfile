FROM node:24-slim AS builder

WORKDIR /app

# Build deps for native modules (e.g., better-sqlite3 via @actual-app/api)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install only production deps; skip Husky prepare in CI builds
RUN HUSKY=0 npm ci --omit=dev --no-audit --no-fund

# Copy source (context is filtered by .dockerignore)
COPY . .

FROM node:24-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy only the minimal runtime artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/config.example.yaml ./config.example.yaml
## Note: .env.example is intentionally excluded by .dockerignore
## If needed, remove the ignore or include it explicitly.

# Prepare a writable data directory
RUN mkdir -p /app/data/budget


# Default command: daemon mode
CMD ["node", "src/index.js", "--mode", "daemon"]
