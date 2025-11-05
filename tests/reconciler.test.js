jest.mock('../src/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const logger = require('../src/logger');

// Mock utils to avoid touching network or filesystem
jest.mock('../src/utils', () => ({
  openBudget: jest.fn(async () => {}),
  closeBudget: jest.fn(async () => {}),
}));

// In-memory capture for updates
const updates = [];

jest.mock('@actual-app/api', () => ({
  getAccounts: jest.fn(async () => [
    { id: 'acct-on', name: 'On Budget', offbudget: false },
    { id: 'acct-off', name: 'Off Budget', offbudget: true },
  ]),
  getTransactions: jest.fn(async (acctId) => {
    if (acctId === 'acct-on') {
      return [
        // Eligible: has category, unreconciled
        { id: 'tx1', category: 'cat1', reconciled: false, date: '2024-01-01' },
        // Not eligible: no category, not transfer
        { id: 'tx2', category: null, reconciled: false, date: '2024-01-01' },
        // Eligible: transfer
        {
          id: 'tx3',
          category: null,
          reconciled: false,
          type: 'transfer',
          date: '2024-01-02',
        },
        // Already reconciled
        { id: 'tx4', category: 'cat2', reconciled: true, date: '2024-01-03' },
      ];
    }
    return [
      // Off-budget eligible: has category
      { id: 'tx5', category: 'catX', reconciled: false, date: '2024-01-04' },
      // Off-budget eligible: transfer
      {
        id: 'tx6',
        category: null,
        reconciled: false,
        transferId: 'abc',
        date: '2024-01-05',
      },
    ];
  }),
  updateTransaction: jest.fn(async (id, patch) => {
    updates.push({ id, patch });
  }),
}));

const utils = require('../src/utils');
const { runReconciliation } = require('../src/reconciler');

describe('runReconciliation', () => {
  beforeEach(() => {
    updates.length = 0;
    delete process.env.RECONCILE_DELAY_DAYS; // default (0 under tests)
    jest.clearAllMocks();
  });

  test('reconciles eligible transactions only', async () => {
    const count = await runReconciliation({
      dryRun: false,
      verbose: true,
      useLogger: true,
    });
    // Expect updates for tx1, tx3, tx5, tx6 (4 total)
    expect(count).toBe(4);
    const ids = updates.map((u) => u.id).sort();
    expect(ids).toEqual(['tx1', 'tx3', 'tx5', 'tx6']);
    updates.forEach((u) =>
      expect(u.patch).toEqual({ reconciled: true, cleared: true }),
    );
  });

  test('respects delay days when set', async () => {
    process.env.RECONCILE_DELAY_DAYS = '36500'; // effectively never
    const count = await runReconciliation({
      dryRun: false,
      verbose: false,
      useLogger: false,
    });
    expect(count).toBe(0);
    expect(updates).toHaveLength(0);
  });

  test('returns 0 when budget fails to open and logs error', async () => {
    utils.openBudget.mockRejectedValueOnce(new Error('nope'));

    const count = await runReconciliation({
      dryRun: false,
      verbose: true,
      useLogger: true,
    });

    expect(count).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Failed to open budget; skipping reconcile run',
    );
    expect(utils.closeBudget).not.toHaveBeenCalled();
  });

  test('logs and returns 0 when reconciliation fails after opening budget', async () => {
    const boom = new Error('boom');
    const api = require('@actual-app/api');
    api.getAccounts.mockImplementationOnce(async () => {
      throw boom;
    });

    const count = await runReconciliation({
      dryRun: false,
      verbose: false,
      useLogger: true,
    });

    expect(count).toBe(0);
    expect(logger.error).toHaveBeenCalledWith(
      { err: boom },
      'Reconcile run failed',
    );
    expect(utils.closeBudget).toHaveBeenCalledTimes(1);
  });
});
