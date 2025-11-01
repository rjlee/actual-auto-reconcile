FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY src ./src

ENV NODE_ENV=production

# Default entrypoint (pass args via docker-compose command)
ENTRYPOINT ["node", "src/index.js"]
