# actual-auto-reconcile

A lightweight service that automatically clears and reconciles eligible transactions in Actual Budget based on simple rules and an optional age delay.

## Requirements

- Node.js ≥20
- An Actual Budget server instance reachable by this service

## Features

- Daemon mode with cron scheduling
- Optional SSE event subscription to react quickly to changes (`actual-events`)
- Configurable delay (days) before marking transactions as cleared/reconciled

## Quick Start

1. Install dependencies: `npm install`
2. Create an `.env` file based on `.env.example`.
3. Run a one-off reconciliation:

   `npm start -- --mode reconcile`

4. Or run as a daemon (cron + optional SSE):

   `npm start -- --mode daemon`

## Environment/Config

- `ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID` (required)
- `BUDGET_DIR` (or `BUDGET_CACHE_DIR`): local cache directory (default: `./data/budget`)
- `RECONCILE_DELAY_DAYS`: minimum age (days) before clearing/reconciling (default: 2; set 0 to reconcile immediately)
- `DISABLE_CRON_SCHEDULING`: `true` to disable cron in daemon mode
- `RECONCILE_CRON` and `RECONCILE_CRON_TIMEZONE`: cron schedule (default: `30 * * * *`, `UTC`)
- `ENABLE_EVENTS`: `true` to enable SSE subscription
- `EVENTS_URL`: SSE endpoint (e.g. from `actual-events`)
- `EVENTS_AUTH_TOKEN`: optional Bearer token for SSE

## Notes

- Only unreconciled transactions are considered
- A transaction becomes eligible for reconciliation when it either already has a category or is a transfer; category is not modified by this service
- For off‑budget accounts, only clear/reconcile flags are applied

## Dev Tooling

- Lint: `npm run lint` / `npm run lint:fix`
- Format: `npm run format` / `npm run format:check`
- Tests: `npm test`
- Git hooks: run `npm run prepare` once, which installs Husky; pre-commit runs `lint-staged` on staged files

## Docker

- Pull latest image: `docker pull ghcr.io/rjlee/actual-auto-reconcile:latest`
- Run with env file:
  - `docker run --rm --env-file .env ghcr.io/rjlee/actual-auto-reconcile:latest`
- Persist cache data to the host by mounting `./data` to `/app/data`
- Or via compose: `docker-compose up -d`

## Image Tags

We publish stable `@actual-app/api` versions (exact semver) plus `latest` (alias of the highest stable). See the release strategy in `rjlee/actual-auto-ci`.

- Examples: `ghcr.io/rjlee/actual-auto-reconcile:25.11.0` (pinned) or `ghcr.io/rjlee/actual-auto-reconcile:latest`.
- Always pick a semver tag that matches your Actual server’s `@actual-app/api` version, or use `latest` if you want the newest supported version automatically.
- Dockerfile build arg `ACTUAL_API_VERSION` is set by CI to the selected API version.

## Release Strategy

- See `rjlee/actual-auto-ci` for centralized CI/CD details and tag policy.

### Tips

- You can list available tags via the GHCR UI under “Packages” for this repo
- If you run a self‑hosted Actual server, choose the image whose API major matches your server’s API line

### Compose Defaults

- Set `ACTUAL_IMAGE_TAG` (e.g. `25.11.0`) in `.env` to pin to a specific semver tag, or leave it unset to follow `latest`.
