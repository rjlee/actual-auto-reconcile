const cron = require('node-cron');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const config = require('./config');
const logger = require('./logger');
const { runReconcileJob, triggerDebounced } = require('./runner');
const { openBudget, closeBudget } = require('./utils');

function scheduleReconcile(verbose) {
  const disableCron =
    process.env.DISABLE_CRON_SCHEDULING === 'true' ||
    config.DISABLE_CRON_SCHEDULING === true;
  if (disableCron) {
    logger.info({ job: 'reconcile' }, 'Cron scheduling disabled');
    return;
  }
  const schedule =
    config.RECONCILE_CRON || process.env.RECONCILE_CRON || '30 * * * *';
  const timezone =
    config.RECONCILE_CRON_TIMEZONE ||
    process.env.RECONCILE_CRON_TIMEZONE ||
    'UTC';
  if (!cron.validate(schedule)) {
    logger.error({ schedule }, `Invalid RECONCILE_CRON: ${schedule}`);
    process.exit(1);
  }
  logger.info(
    { job: 'reconcile', schedule, timezone },
    'Scheduling reconcile daemon',
  );
  cron.schedule(
    schedule,
    async () => {
      const ts = new Date().toISOString();
      logger.info({ ts }, 'Daemon reconcile run start');
      try {
        const count = await runReconcileJob({ verbose });
        logger.info({ ts, count }, 'Daemon reconcile run complete');
      } catch (err) {
        logger.error({ err, ts }, 'Daemon reconcile failed');
      }
    },
    timezone ? { timezone } : {},
  );
}

async function runDaemon({ verbose }) {
  logger.info('Performing initial budget sync');
  try {
    await openBudget();
    logger.info('Initial budget sync complete');
  } catch (err) {
    logger.error({ err }, 'Initial budget sync failed');
  } finally {
    await closeBudget();
  }

  scheduleReconcile(verbose);

  const enableEvents =
    config.enableEvents === true ||
    config.ENABLE_EVENTS === true ||
    /^true$/i.test(process.env.ENABLE_EVENTS || '');
  const eventsUrl =
    config.eventsUrl || config.EVENTS_URL || process.env.EVENTS_URL || '';
  const authToken =
    config.eventsAuthToken ||
    config.EVENTS_AUTH_TOKEN ||
    process.env.EVENTS_AUTH_TOKEN ||
    '';
  if (enableEvents && eventsUrl) {
    startEventsListener({ eventsUrl, authToken, verbose });
  } else if (enableEvents && !eventsUrl) {
    logger.warn(
      'ENABLE_EVENTS set but EVENTS_URL missing; skipping event listener',
    );
  }
}

module.exports = { runDaemon, scheduleReconcile };

function startEventsListener({ eventsUrl, authToken, verbose }) {
  try {
    const base = new URL(eventsUrl);
    if (!base.searchParams.get('events')) {
      base.searchParams.set('events', '^transaction\\.(created|updated)$');
      base.searchParams.set('entities', 'transaction');
      base.searchParams.set('useRegex', 'true');
    }
    const isHttps = base.protocol === 'https:';
    const agent = isHttps ? https : http;
    let lastId = undefined;
    let retryMs = 2000;

    const connect = () => {
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      if (lastId) headers['Last-Event-ID'] = lastId;
      headers['Accept'] = 'text/event-stream';
      const req = agent.request(base, { method: 'GET', headers }, (res) => {
        if (res.statusCode !== 200) {
          logger.warn(
            { status: res.statusCode },
            'Event stream non-200; retrying',
          );
          res.resume();
          setTimeout(connect, retryMs);
          retryMs = Math.min(30000, retryMs * 2);
          return;
        }
        logger.info({ url: base.toString() }, 'Connected to event stream');
        retryMs = 2000;
        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString('utf8');
          let idx;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const raw = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            handleEvent(raw);
          }
        });
        res.on('end', () => {
          logger.warn('Event stream ended; reconnecting');
          setTimeout(connect, retryMs);
          retryMs = Math.min(30000, retryMs * 2);
        });
      });
      req.on('error', (err) => {
        logger.warn({ err }, 'Event stream error; reconnecting');
        setTimeout(connect, retryMs);
        retryMs = Math.min(30000, retryMs * 2);
      });
      req.end();
    };

    const handleEvent = (raw) => {
      try {
        const lines = raw.split(/\r?\n/);
        let id = null;
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (!line) continue;
          if (line.startsWith('id:')) id = line.slice(3).trim();
          else if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (id) lastId = id;
        if (!data) return;
        const payload = JSON.parse(data);
        if (
          event === 'transaction.created' ||
          event === 'transaction.updated'
        ) {
          if (verbose) {
            logger.info(
              { event, txId: payload?.after?.id || payload?.before?.id },
              'Event received; scheduling reconcile',
            );
          }
          triggerDebounced({ verbose, delayMs: 1500 });
        }
      } catch (_) {
        // ignore parse errors
      }
    };

    connect();
  } catch (err) {
    logger.warn({ err }, 'Failed to start event listener');
  }
}
