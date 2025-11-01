#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const config = require('./config');
const logger = require('./logger');
const { runReconciliation } = require('./reconciler');
const { runDaemon } = require('./daemon');

process.on('uncaughtException', (err) => {
  logger.warn({ err }, 'Uncaught exception, ignoring');
});
process.on('unhandledRejection', (err) => {
  logger.warn({ err }, 'Unhandled promise rejection, ignoring');
});

async function main(args = process.argv.slice(2)) {
  const argv = require('yargs/yargs')(args)
    .option('mode', {
      alias: 'm',
      choices: ['reconcile', 'daemon'],
      default: 'reconcile',
      describe: 'Mode to run',
    })
    .option('dry-run', {
      type: 'boolean',
      default: false,
      describe: 'Do not update Actual',
    })
    .option('verbose', {
      type: 'boolean',
      default: false,
      describe: 'Verbose logging',
    })
    .help().argv;

  const { mode, dryRun, verbose } = argv;

  // Prepare local budget cache directory
  const budgetDir =
    config.budgetDir ||
    process.env.BUDGET_DIR ||
    process.env.BUDGET_CACHE_DIR ||
    './data/budget';
  if (!fs.existsSync(budgetDir)) fs.mkdirSync(budgetDir, { recursive: true });
  process.env.BUDGET_CACHE_DIR = budgetDir;
  logger.info({ budgetDir }, 'Using budget cache directory');

  switch (mode) {
    case 'reconcile': {
      const count = await runReconciliation({
        dryRun,
        verbose,
        useLogger: false,
      });
      if (!dryRun) {
        logger.info({ appliedCount: count }, 'Reconcile applied');
      } else {
        logger.info(
          { appliedCount: count },
          'Dry-run complete; no updates applied',
        );
      }
      break;
    }
    case 'daemon':
      await runDaemon({ verbose });
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
