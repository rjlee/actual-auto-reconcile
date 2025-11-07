# actual-auto-reconcile

Automatically clear and reconcile eligible transactions in Actual Budget using simple age-based rules. Ideal for keeping “settled” transactions tidy without lifting a finger.

## Features

- Cron-driven daemon that clears/reconciles transactions after a configurable delay.
- Optional SSE integration with `actual-events` to reconcile shortly after changes arrive.
- Safe defaults: only unreconciled transactions are touched; categories are never modified.
- Docker image with baked-in health check for orchestration.

## Requirements

- Node.js ≥ 20.
- Access to an Actual Budget server (`ACTUAL_SERVER_URL`, credentials).
- Writable location for budget cache (`./data/budget` by default).

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
docker run --rm --env-file .env \
  -v "$(pwd)/data:/app/data" \
  actual-auto-reconcile --mode daemon
```

Prebuilt images live at `ghcr.io/rjlee/actual-auto-reconcile:<tag>` (see [Image tags](#image-tags)).

## Configuration

- `.env` – required credentials and daemon flags; see `.env.example`.
- `config.yaml` / `config.yml` / `config.json` – optional defaults; copy from `config.example.yaml`.

Precedence: CLI flags > environment variables > config file.

Key settings:

| Setting                                      | Description                       | Default              |
| -------------------------------------------- | --------------------------------- | -------------------- |
| `BUDGET_DIR`                                 | Budget cache directory            | `./data/budget`      |
| `RECONCILE_DELAY_DAYS`                       | Minimum age before reconciliation | `2`                  |
| `RECONCILE_CRON` (`RECONCILE_CRON_TIMEZONE`) | Cron schedule                     | `30 * * * *` / `UTC` |
| `DISABLE_CRON_SCHEDULING`                    | Disable cron in daemon mode       | `false`              |
| `ENABLE_EVENTS` / `EVENTS_URL`               | Enable SSE listener               | disabled             |

## Usage

### One-off reconciliation

```bash
npm start -- --mode reconcile
```

### Daemon mode

```bash
npm start -- --mode daemon
```

With SSE:

```bash
ENABLE_EVENTS=true EVENTS_URL=http://localhost:4000/events npm start -- --mode daemon
```

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

- `ghcr.io/rjlee/actual-auto-reconcile:<semver>` – matches a specific `@actual-app/api` release.
- `ghcr.io/rjlee/actual-auto-reconcile:latest` – highest supported API version.

See [rjlee/actual-auto-ci](https://github.com/rjlee/actual-auto-ci) for tagging policy.

## Tips

- Set `RECONCILE_DELAY_DAYS=0` to reconcile immediately once a transaction is cleared.
- For compose deployments, use the shared `ACTUAL_IMAGE_TAG` environment variable to pin all services to the same API version.

## License

MIT © contributors.
