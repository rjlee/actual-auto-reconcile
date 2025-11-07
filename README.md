# actual-auto-reconcile

Automatically clear and reconcile eligible transactions in Actual Budget using simple age-based rules. Keeps settled activity tidy without touching categories or inflight items.

## Features

- Cron-driven daemon that reconciles and clears transactions after a configurable delay.
- Optional `actual-events` integration to react shortly after new activity arrives.
- Idempotent logic: only unreconciled transactions are updated, categories stay untouched.
- Docker image with baked-in health check and bind-mount friendly data directory.

## Requirements

- Node.js ≥ 22.
- Actual Budget server credentials (`ACTUAL_SERVER_URL`, `ACTUAL_PASSWORD`, `ACTUAL_SYNC_ID`).
- Writable cache directory for the downloaded budget (defaults to `./data/budget`).

## Installation

```bash
git clone https://github.com/rjlee/actual-auto-reconcile.git
cd actual-auto-reconcile
npm install
```

Optional git hooks:

```bash
npm run prepare
```

### Docker quick start

```bash
cp .env.example .env
docker build -t actual-auto-reconcile .
mkdir -p data/budget
docker run -d --env-file .env \
  -v "$(pwd)/data:/app/data" \
  actual-auto-reconcile --mode daemon
```

Published images live at `ghcr.io/rjlee/actual-auto-reconcile:<tag>` (see [Image tags](#image-tags)).

## Configuration

- `.env` – primary configuration, copy from `.env.example`.
- `config.yaml` / `config.yml` / `config.json` – optional defaults, copy from `config.example.yaml`.

Precedence: CLI flags > environment variables > config file.

| Setting                                      | Description                               | Default              |
| -------------------------------------------- | ----------------------------------------- | -------------------- |
| `BUDGET_DIR` (`BUDGET_CACHE_DIR`)            | Budget cache directory                    | `./data/budget`      |
| `RECONCILE_DELAY_DAYS`                       | Minimum age before clearing + reconciling | `2`                  |
| `RECONCILE_CRON` / `RECONCILE_CRON_TIMEZONE` | Daemon cron schedule                      | `30 * * * *` / `UTC` |
| `DISABLE_CRON_SCHEDULING`                    | Disable cron while in daemon mode         | `false`              |
| `ENABLE_EVENTS` / `EVENTS_URL`               | Subscribe to `actual-events` SSE stream   | disabled             |
| `EVENTS_AUTH_TOKEN`                          | Bearer token for the SSE stream           | unset                |
| `LOG_LEVEL`                                  | Pino log level                            | `info`               |

## Usage

### CLI modes

- One-off reconciliation: `npm start -- --mode reconcile`
- Daemon with cron scheduling: `npm start -- --mode daemon`
- Events-enabled daemon: `ENABLE_EVENTS=true EVENTS_URL=http://localhost:4000/events npm start -- --mode daemon`

### Docker daemon

```bash
docker run -d --env-file .env \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/rjlee/actual-auto-reconcile:latest --mode daemon
```

## Testing & linting

```bash
npm test
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Image tags

- `ghcr.io/rjlee/actual-auto-reconcile:<semver>` – pinned to a specific `@actual-app/api` release.
- `ghcr.io/rjlee/actual-auto-reconcile:latest` – highest supported API version.

See [rjlee/actual-auto-ci](https://github.com/rjlee/actual-auto-ci) for tagging policy and automation details.

## License

MIT © contributors.
