#!/usr/bin/env node
require('dotenv').config();

const { openBudget, closeBudget } = require('./utils');
const logger = require('./logger');
const {
  getAccounts,
  getTransactions,
  updateTransaction,
} = require('@actual-app/api');

const noop = () => {};

/**
 * Reconcile logic: mark eligible unreconciled transactions as cleared/reconciled.
 * Eligibility: transaction has a category OR is a transfer.
 * Delay: optional age in days before reconciling (RECONCILE_DELAY_DAYS; default 2; 0 = immediate).
 */
async function runReconciliation({
  dryRun = false,
  verbose = false,
  useLogger = false,
} = {}) {
  const log = useLogger
    ? logger
    : { info: noop, debug: noop, error: noop, warn: noop };

  // Open budget; skip run if unable to connect
  try {
    log.info({ dryRun, verbose }, 'Opening budget');
    await openBudget();
  } catch (err) {
    log.error({ err }, 'Failed to open budget; skipping reconcile run');
    return 0;
  }

  const start = Date.now();
  try {
    const delaySetting = process.env.RECONCILE_DELAY_DAYS;
    const reconcileDelayDays =
      delaySetting === undefined
        ? process.env.NODE_ENV === 'test'
          ? 0
          : 2
        : Math.max(0, parseInt(delaySetting, 10) || 0);

    const accounts = await getAccounts();
    let candidates = [];
    for (const acct of accounts) {
      const txns = await getTransactions(acct.id);
      candidates.push(...txns.filter((tx) => !tx.reconciled));
    }

    const isTransfer = (tx) =>
      tx?.is_transfer === true ||
      tx?.isTransfer === true ||
      tx?.transfer_id != null ||
      tx?.transferId != null ||
      tx?.linkedTransaction != null ||
      tx?.linkedTransactionId != null ||
      tx?.type === 'transfer';

    let applied = 0;
    for (const tx of candidates) {
      if (!tx.category && !isTransfer(tx)) continue;

      // Compute age eligibility
      const d = tx.date || tx.postDate || tx.importedDate;
      let canReconcile = reconcileDelayDays === 0;
      if (!canReconcile && d) {
        const txDate = new Date(d);
        if (!isNaN(txDate)) {
          const now = new Date();
          const ageMs = now.getTime() - txDate.getTime();
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          canReconcile = ageDays >= reconcileDelayDays;
        }
      }
      if (!canReconcile) continue;

      if (verbose) log.debug({ txId: tx.id }, 'Reconciling transaction');
      if (!dryRun) {
        await updateTransaction(tx.id, { reconciled: true, cleared: true });
      }
      applied++;
    }

    const durationMs = Date.now() - start;
    log.info({ appliedCount: applied, durationMs }, 'Reconcile run complete');
    return applied;
  } catch (err) {
    logger.error({ err }, 'Reconcile run failed');
    return 0;
  } finally {
    await closeBudget();
  }
}

module.exports = { runReconciliation };
