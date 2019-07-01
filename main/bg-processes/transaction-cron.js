"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cron = require("cron");
var cronJob = cron.CronJob;
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var transaction_sync_1 = require("./transaction-sync");
var TransactionTransferSync = transaction_sync_1.TransactionSync.TransactionTransferSync;
var TransactionOrderSync = transaction_sync_1.TransactionSync.TransactionOrderSync;
var TransactionListSync = transaction_sync_1.TransactionSync.TransactionListSync;
var app_meta_1 = require("../app-meta");
// get transaction list
function initTransactionListSyncCron(storePath, userDBPath) {
    var transactionListSync;
    return new cronJob(app_meta_1.TRANSACTION_LIST_SYNC_CRON_SCHEDULE_PATTERN, function () {
        transactionListSync = TransactionListSync.getInstace(storePath, userDBPath);
        transactionListSync.startListSync();
    });
}
exports.initTransactionListSyncCron = initTransactionListSyncCron;
// syncs only orders and marks local DB records order and transaction as order synced
function initOrderSyncCron(storePath, userDBPath) {
    var transactionOrderSync;
    return new cronJob(app_meta_1.ORDERS_SYNC_CRON_SCHEDULE_PATTERN, function () {
        transactionOrderSync = new TransactionOrderSync(storePath, userDBPath);
        transactionOrderSync.start();
    });
}
exports.initOrderSyncCron = initOrderSyncCron;
// syncs only transaction, whos orders are already synced
function initTransferSyncCron(storePath, userDBPath) {
    var transactionTransferSync;
    return new cronJob(app_meta_1.TRANSFERS_SYNC_CRON_SCHEDULE_PATTERN, function () {
        transactionTransferSync = new TransactionTransferSync(storePath, userDBPath);
        transactionTransferSync.start(function (err, resp) {
            // restarting transaction list sync after transfer synced successfully
            if (resp) {
                var transactionListSync = TransactionListSync.getInstace(storePath, userDBPath);
                transactionListSync.startListSync();
            }
        });
    });
}
exports.initTransferSyncCron = initTransferSyncCron;
//# sourceMappingURL=transaction-cron.js.map