# actual-auto-reconcile

A lightweight service that automatically clears and reconciles eligible transactions in Actual Budget based on simple rules and an optional age delay.

Requirements

- Node.js ≥20
- An Actual Budget server instance reachable by this service

Features

- Daemon mode with cron scheduling.
- Optional SSE event subscription to react quickly to changes (`actual-events`).
- Configurable delay (days) before marking transactions as cleared/reconciled.

Quick start

1. Install dependencies: `npm install`
2. Create an `.env` file based on `.env.example`.
3. Run a one-off reconciliation:

   `npm start -- --mode reconcile`

4. Or run as a daemon (cron + optional SSE):

   `npm start -- --mode daemon`

Environment / Config

- `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID` (required)
- `BUDGET_DIR` (or `BUDGET_CACHE_DIR`): local cache directory (default: `./data/budget`)
- `RECONCILE_DELAY_DAYS`: minimum age (days) before clearing/reconciling (default: 5; set 0 to reconcile immediately)
- `DISABLE_CRON_SCHEDULING`: `true` to disable cron in daemon mode
- `RECONCILE_CRON` and `RECONCILE_CRON_TIMEZONE`: cron schedule (default: `0 * * * *`, `UTC`)
- `ENABLE_EVENTS`: `true` to enable SSE subscription
- `EVENTS_URL`: SSE endpoint (e.g. from `actual-events`)
- `EVENTS_AUTH_TOKEN`: optional Bearer token for SSE

Notes

- Only unreconciled transactions are considered.
- A transaction becomes eligible for reconciliation when it either already has a category or is a transfer. Category is not modified by this service.
- For off‑budget accounts, only clear/reconcile flags are applied.

Dev tooling

- Lint: `npm run lint` / `npm run lint:fix`
- Format: `npm run format` / `npm run format:check`
- Tests: `npm test`
- Git hooks: run `npm run prepare` once, which installs Husky. Pre-commit runs `lint-staged` on staged files.

Docker

- Pull latest image: `docker pull ghcr.io/rjlee/actual-auto-reconcile:latest`
- Run with env file:
  - `docker run --rm --env-file .env ghcr.io/rjlee/actual-auto-reconcile:latest`
- Persist cache data to the host by mounting `./data` to `/app/data`.
- Or via compose: `docker-compose up -d`

## API-Versioned Images

Actual Budget's server and `@actual-app/api` should be compatible. This project publishes API-specific images so you can pick an image that matches your server:

- Exact pin: `ghcr.io/<owner>/<repo>:api-25.2.1`
- Minor alias: `ghcr.io/<owner>/<repo>:api-25.2`
- Major alias: `ghcr.io/<owner>/<repo>:api-25`

The Dockerfile accepts a build arg `ACTUAL_API_VERSION` and the CI builds images for every patch in the last 3 major API lines. Images include labels:

- `io.actual.api.version` — the `@actual-app/api` version
- `org.opencontainers.image.revision` — git SHA
- `org.opencontainers.image.version` — app version

Examples:

- Run with a specific API line: `docker run --rm --env-file .env ghcr.io/<owner>/<repo>:api-25`
- Pin exact API patch: `docker run --rm --env-file .env ghcr.io/<owner>/<repo>:api-25.2.1`
