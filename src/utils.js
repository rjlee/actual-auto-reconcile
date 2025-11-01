require('dotenv').config();
const fs = require('fs');
const api = require('@actual-app/api');
const logger = require('./logger');

let hasDownloadedBudget = false;

function __resetBudgetDownloadFlag() {
  hasDownloadedBudget = false;
}

async function openBudget() {
  const url = process.env.ACTUAL_SERVER_URL;
  const password = process.env.ACTUAL_PASSWORD;
  const syncId = process.env.ACTUAL_SYNC_ID;
  if (!url || !password || !syncId) {
    throw new Error(
      'Please set ACTUAL_SERVER_URL, ACTUAL_PASSWORD, and ACTUAL_SYNC_ID environment variables',
    );
  }
  try {
    const dataDir =
      process.env.BUDGET_DIR || process.env.BUDGET_CACHE_DIR || './data/budget';

    fs.mkdirSync(dataDir, { recursive: true });

    logger.info('Connecting to Actual API...');
    await api.init({ dataDir, serverURL: url, password });

    const opts = {};
    const budgetPassword = process.env.ACTUAL_BUDGET_ENCRYPTION_PASSWORD;
    if (budgetPassword) opts.password = budgetPassword;

    if (!hasDownloadedBudget) {
      logger.info('Downloading budget (no backup)...');
      try {
        await api.downloadBudget(syncId, opts);
        logger.info('Budget downloaded');
      } catch (err) {
        logger.warn({ err }, 'Failed to download budget');
      }
      hasDownloadedBudget = true;
    }

    logger.info('Syncing budget changes...');
    await api
      .sync()
      .then(() => logger.info('Budget synced'))
      .catch((err) => logger.warn({ err }, 'Failed to sync budget'));
  } catch (err) {
    logger.warn({ err }, 'Unexpected error in openBudget');
  }
}

async function closeBudget() {
  hasDownloadedBudget = false;
  try {
    await api.shutdown();
    if (typeof api.resetBudgetCache === 'function') {
      await api.resetBudgetCache();
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

module.exports = { openBudget, closeBudget, __resetBudgetDownloadFlag };
