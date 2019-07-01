import * as cron from 'cron';
const cronJob = cron.CronJob;

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

import { TransactionSync } from './transaction-sync';
import TransactionTransferSync = TransactionSync.TransactionTransferSync;
import TransactionOrderSync = TransactionSync.TransactionOrderSync;
import TransactionListSync = TransactionSync.TransactionListSync;

import {
  ORDERS_SYNC_CRON_SCHEDULE_PATTERN, TRANSACTION_LIST_SYNC_CRON_SCHEDULE_PATTERN,
  TRANSFERS_SYNC_CRON_SCHEDULE_PATTERN
} from '../app-meta';

// get transaction list
export function initTransactionListSyncCron(storePath: string, userDBPath: string) {
  let transactionListSync: TransactionListSync;

  return new cronJob(TRANSACTION_LIST_SYNC_CRON_SCHEDULE_PATTERN, () => {
    transactionListSync = TransactionListSync.getInstace(storePath, userDBPath);
    transactionListSync.startListSync();
  });
}

// syncs only orders and marks local DB records order and transaction as order synced
export function initOrderSyncCron(storePath: string, userDBPath: string) {
  let transactionOrderSync: TransactionOrderSync;
  return new cronJob(ORDERS_SYNC_CRON_SCHEDULE_PATTERN, () => {
    transactionOrderSync = new TransactionOrderSync(storePath, userDBPath);
    transactionOrderSync.start();
  });
}

// syncs only transaction, whos orders are already synced
export function initTransferSyncCron(storePath: string, userDBPath: string) {
  let transactionTransferSync: TransactionTransferSync;

  return new cronJob(TRANSFERS_SYNC_CRON_SCHEDULE_PATTERN, () => {
    transactionTransferSync = new TransactionTransferSync(storePath, userDBPath);
    transactionTransferSync.start((err, resp) => {
      // restarting transaction list sync after transfer synced successfully
      if (resp) {
        const transactionListSync = TransactionListSync.getInstace(storePath, userDBPath);
        transactionListSync.startListSync();
      }
    });
  });
}
