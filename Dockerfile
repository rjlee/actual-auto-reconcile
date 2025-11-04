FROM node:22-slim AS base

WORKDIR /app

# Accept Actual API version as a build argument
ARG ACTUAL_API_VERSION
ARG GIT_SHA
ARG APP_VERSION

// Install build deps for native modules (better-sqlite3) and production deps;
// allow overriding @actual-app/api
COPY package*.json ./
ENV HUSKY=0
ENV PYTHON=/usr/bin/python3
ENV npm_config_python=/usr/bin/python3
RUN set -eux; \
    if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache python3 make g++; \
    else \
      apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*; \
    fi; \
    if [ -n "$ACTUAL_API_VERSION" ]; then \
      npm pkg set dependencies.@actual-app/api=$ACTUAL_API_VERSION && \
      npm install --package-lock-only --no-audit --no-fund; \
    fi; \
    npm ci --omit=dev --no-audit --no-fund

# Copy application source
COPY src ./src

ENV NODE_ENV=production

# Useful metadata
LABEL org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.version="$APP_VERSION" \
      io.actual.api.version="$ACTUAL_API_VERSION"

# Default entrypoint (pass args via docker-compose command)
ENTRYPOINT ["node", "src/index.js"]
