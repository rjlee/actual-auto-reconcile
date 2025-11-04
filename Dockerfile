FROM node:20-slim AS base

WORKDIR /app

# Accept Actual API version as a build argument
ARG ACTUAL_API_VERSION
ARG GIT_SHA
ARG APP_VERSION

# Install dependencies (production only); allow overriding @actual-app/api
COPY package*.json ./
ENV HUSKY=0
RUN if [ -n "$ACTUAL_API_VERSION" ]; then \
      npm pkg set dependencies.@actual-app/api=$ACTUAL_API_VERSION && \
      npm install --package-lock-only --ignore-scripts; \
    fi && \
    npm ci --omit=dev --ignore-scripts

# Copy application source
COPY src ./src

ENV NODE_ENV=production

# Useful metadata
LABEL org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.version="$APP_VERSION" \
      io.actual.api.version="$ACTUAL_API_VERSION"

# Default entrypoint (pass args via docker-compose command)
ENTRYPOINT ["node", "src/index.js"]
