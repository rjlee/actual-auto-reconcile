const logger = require('./logger');
const { runReconciliation } = require('./reconciler');

let running = false;
let pending = false;
let debounceTimer = null;

async function runReconcileJob({ verbose = false } = {}) {
  if (running) {
    logger.warn(
      { source: 'runner' },
      'Skip reconcile: previous run still active',
    );
    pending = true;
    return 0;
  }
  running = true;
  try {
    const count = await runReconciliation({
      dryRun: false,
      verbose,
      useLogger: true,
    });
    return count;
  } catch (err) {
    logger.error({ err }, 'Reconcile run failed');
    return 0;
  } finally {
    running = false;
    if (pending) {
      pending = false;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runReconcileJob({ verbose }).catch(() => {});
      }, 1000);
    }
  }
}

function triggerDebounced({ verbose = false, delayMs = 1500 } = {}) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(
    () => {
      runReconcileJob({ verbose }).catch(() => {});
    },
    Math.max(0, delayMs),
  );
}

module.exports = { runReconcileJob, triggerDebounced };
