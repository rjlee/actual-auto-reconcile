FROM node:24-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci && npm prune --production

COPY . .

FROM node:24-slim AS runner

WORKDIR /app

COPY --from=builder /app /app

CMD ["npm", "run", "daemon"]

