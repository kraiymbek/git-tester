"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var app_meta_1 = require("../app-meta");
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var TransactionSync;
(function (TransactionSync) {
    var TransactionTransferSync = /** @class */ (function () {
        function TransactionTransferSync(_storePath, _userDBPath) {
            this._storePath = _storePath;
            this._userDBPath = _userDBPath;
            this.credStore = new filestorage_1.FileStorage(this._storePath);
            this.ordersDb = new PouchDB(this._userDBPath + '/' + app_meta_1.ORDER_SYNC_DB_NAME);
            this.transactsDb = new PouchDB(this._userDBPath + '/' + app_meta_1.TRANSACTIONS_SYNC_DB_NAME);
        }
        TransactionTransferSync.prototype.start = function (cb) {
            var _this = this;
            this.credStore.getCredentials(function (credGetError, credentials) {
                if (credGetError) {
                    return log.error(['Error getting credentials from file system']);
                }
                try {
                    credentials = JSON.parse(credentials);
                    // check if credentials for current user are valid
                    if (_this._isCredentialsValid(credentials) && _this._isWorkshiftIdExist(credentials)) {
                        _this.transactsDb.find({
                            selector: {
                                isSynced: false,
                                orderSynced: true,
                            },
                        }).then(function (r) {
                            console.log('transaction to be synced', r);
                            // sync transactions
                            // records orders and transaction db as synced
                            return _this._saveTransferRemote(r.docs, credentials);
                        }).then(function (r) {
                            if (cb) {
                                cb(null, r);
                            }
                            return log.debug(['transaction sync ended successfully see details: ', r]);
                        }).catch(function (err) {
                            if (cb) {
                                cb(err, null);
                            }
                            return log.error(['error while saving transactions see details:', err]);
                        });
                    }
                    else {
                        var err = 'Error saving transaction. credentials not valid';
                        if (cb) {
                            cb(err, null);
                        }
                        return log.error([err]);
                    }
                }
                catch (e) {
                    if (cb) {
                        cb(e, null);
                    }
                    return log.error(['Error when parsing credentials', e]);
                }
            });
        };
        TransactionTransferSync.prototype._isCredentialsValid = function (credentials) {
            return credentials && credentials.authCredentials && credentials.authCredentials.merchantId
                && credentials.authCredentials.access_token
                && credentials.environmentData;
        };
        TransactionTransferSync.prototype._isWorkshiftIdExist = function (credentials) {
            return credentials && credentials.currentWorkshift;
        };
        TransactionTransferSync.prototype._saveTransferRemote = function (transactions, credentials) {
            var _this = this;
            var transReq = new backgroundsync_request_1.BgSyncRequests.TransactionSyncRequest(credentials);
            return Promise.all(transactions.map(function (transaction) {
                transaction.workShiftId = credentials.currentWorkshift;
                return transReq.saveTransaction(transaction)
                    .then(function (r) {
                    if (r && r.status === 401) {
                        return Promise.reject({ message: 'Not authorized to perform transaction request' });
                    }
                    if (r && r.status === 200) {
                        return _this.transactsDb.get(transaction.orderRef)
                            .then(function (doc) {
                            doc.isSynced = true;
                            return _this.transactsDb.put(doc);
                        })
                            .then(function (saveR) {
                            if (saveR.ok) {
                                console.log('transaction marking done');
                                return _this.ordersDb.get(transaction.orderRef);
                            }
                            return Promise.reject({ message: 'Expected success. ' +
                                    'But got error updating synced mark on transaction', dataToLog: transaction, needLog: true });
                        })
                            .then(function (order) {
                            if (order.isSynced) {
                                order.transferSynced = true;
                                return _this.ordersDb.put(order);
                            }
                            return Promise.reject({
                                message: 'Warning. Transaction synced. But order does not synced.',
                                dataToLog: {
                                    transaction: transaction,
                                    order: order,
                                },
                                needLog: true,
                            });
                        })
                            .then(function (orderres) {
                            if (orderres.ok) {
                                console.log('order marking done');
                                return Promise.resolve({
                                    status: 200,
                                    message: 'Transaction successfully transfered and lDB for order and transaction' + transaction.orderRef
                                });
                            }
                        })
                            .catch(function (e) {
                            return Promise.reject({ message: 'Got lDB error updating synced mark on transaction',
                                dataToLog: { transaction: transaction, details: e }, needLog: true });
                        });
                    }
                    return new Promise(function (resolve) { return resolve({ message: 'uncought error', details: r, needLog: true, error: true }); });
                });
            }));
        };
        return TransactionTransferSync;
    }());
    TransactionSync.TransactionTransferSync = TransactionTransferSync;
    var TransactionOrderSync = /** @class */ (function () {
        function TransactionOrderSync(_storePath, _userDBPath) {
            this._storePath = _storePath;
            this._userDBPath = _userDBPath;
            this.credStore = new filestorage_1.FileStorage(this._storePath);
            this.ordersDb = new PouchDB(this._userDBPath + '/' + app_meta_1.ORDER_SYNC_DB_NAME);
            this.transactsDb = new PouchDB(this._userDBPath + '/' + app_meta_1.TRANSACTIONS_SYNC_DB_NAME);
        }
        TransactionOrderSync.prototype.start = function () {
            var _this = this;
            this.credStore.getCredentials(function (credGetError, credentials) {
                if (credGetError) {
                    return log.error(['error getting credentials', credGetError]);
                }
                _this.ordersDb.find({
                    selector: {
                        isSynced: false,
                    },
                }).then(function (r) {
                    // catch json parse error
                    if (r.docs && r.docs.length) {
                        try {
                            credentials = JSON.parse(credentials);
                            var orders = r.docs;
                            return _this._saveOrdersToRemoteDB(orders, credentials);
                        }
                        catch (e) {
                            return Promise.reject({ message: e });
                        }
                    }
                    return Promise.reject({ message: 'There is not any records to be synced in orders lDB', status: 404 });
                }).then(function (orderSaveR) {
                    var orderSaveResp = orderSaveR;
                    if (orderSaveResp && orderSaveResp.status) {
                        return Promise.reject({ message: 'some error accured while saving to remote db', details: orderSaveResp });
                    }
                    // mark as synced every order and then save transaction
                    if (orderSaveResp && orderSaveResp.order_states && orderSaveResp.order_states.length) {
                        return _this._markOrderAndTransferAsSynced(orderSaveResp.order_states);
                    }
                }).then(function (r) {
                    log.log('done sync process successfully');
                }).catch(function (err) {
                    log.error(['error while syncing process. Details below', err]);
                });
            });
        };
        TransactionOrderSync.prototype._saveOrdersToRemoteDB = function (orders, credentials) {
            var transReq = new backgroundsync_request_1.BgSyncRequests.TransactionSyncRequest(credentials);
            return transReq.saveOrder({ offlineOrders: orders });
        };
        /*
        * after order synced, marks as orderSynced in
        * order and transfer records in lDB as synced
        * */
        TransactionOrderSync.prototype._markOrderAndTransferAsSynced = function (order_states) {
            var _this = this;
            return Promise.all(order_states.map(function (state) {
                var docId = state.uid;
                var isCreated = state.created;
                var invoiceRef = state.invoice_ref ? state.invoice_ref : '';
                return _this.ordersDb.get(docId)
                    .then(function (d) {
                    d.isSynced = isCreated;
                    d.invoiceRef = invoiceRef;
                    return _this.ordersDb.put(d);
                }).then(function (r) {
                    // save to transaction
                    return _this.transactsDb.get(docId);
                }).then(function (r) {
                    r.orderSynced = isCreated;
                    return _this.transactsDb.put(r);
                }).catch(function (e) {
                    return Promise.reject(e);
                });
            }));
        };
        return TransactionOrderSync;
    }());
    TransactionSync.TransactionOrderSync = TransactionOrderSync;
    var TransactionListSync = /** @class */ (function () {
        function TransactionListSync(_storePath, _ldbPath) {
            this._storePath = _storePath;
            this._ldbPath = _ldbPath;
            this.isSyncing = false;
            this.credStore = new filestorage_1.FileStorage(this._storePath);
            this.transactListDb = new PouchDB(this._ldbPath + '/' + app_meta_1.TRANSACTIONS_LIST_SYNC_DB_NAME);
        }
        TransactionListSync.getInstace = function (_storePath, _ldbPath) {
            if (!this._instance) {
                this._instance = new TransactionListSync(_storePath, _ldbPath);
            }
            return this._instance;
        };
        TransactionListSync.stop = function () {
            this._instance = null;
        };
        TransactionListSync.prototype.startListSync = function () {
            var _this = this;
            this.credStore.getCredentials(function (credGetError, credentials) {
                if (credGetError) {
                    return log.error(['error getting credentials', credGetError]);
                }
                try {
                    credentials = JSON.parse(credentials);
                    var filter = {
                        count: 50,
                        last: 0,
                    };
                    if (_this.isSyncing) {
                        return;
                    }
                    _this.isSyncing = true;
                    _this._getData(filter, credentials);
                }
                catch (e) {
                    _this.isSyncing = false;
                    log.error(['credentials parse error while transaction list sync', e]);
                }
            });
        };
        TransactionListSync.prototype._getData = function (filter, credentials) {
            var _this = this;
            this.credStore.getDataFromFile(app_meta_1.LAST_UPD_TRANS_LIST_DATE_FILE_NAME, function (errRead, date) {
                if (errRead) {
                    filter['from'] = app_meta_1.INITIAL_TRANSLIST_SYNC_DATE;
                }
                if (date) {
                    try {
                        date = JSON.parse(date);
                        filter['from'] = date.lastUpdatedDate;
                    }
                    catch (e) {
                        filter['from'] = app_meta_1.INITIAL_TRANSLIST_SYNC_DATE;
                        log.error(['Error parsing tranactions date: details - ' + date, e]);
                    }
                }
                console.log('transactions sync list started from date - ', filter.from);
                _this._getTransactionsLists(filter, credentials, function (err, resp) {
                    if (err) {
                        log.error(['error saving trans list', err]);
                    }
                    _this.isSyncing = false;
                });
            });
        };
        TransactionListSync.prototype._getTransactionsLists = function (filter, credentials, callback) {
            var _this = this;
            var transReq = new backgroundsync_request_1.BgSyncRequests.TransactionSyncRequest(credentials);
            transReq.getTransactionList(filter)
                .then(function (r) {
                if (r && r.status === 401) {
                    return callback(r, null);
                }
                if (r && r.status === 500) {
                    return callback(r, null);
                }
                if (r && r.status) {
                    return callback(r, null);
                }
                console.log('-------------------');
                console.log('items total -' + r.totalAmount + '; number of items to save-', r.data.length);
                if (!(r.data && r.data.length)) {
                    return callback({ message: 'Error: Not found', Error: r, status: 404 }, null);
                }
                var transactions = r.data;
                filter.from = transactions[transactions.length - 1].createdDate;
                var lastItemDate = {
                    lastUpdatedDate: filter.from,
                    lastUpdatedItem: transactions[transactions.length - 1],
                };
                _this.transactListDb.createIndex({
                    index: {
                        fields: ['createdDate'],
                        name: 'createdDateIdx',
                    },
                }).then(function (result) { }).catch(function (err) { });
                _this.transactListDb.bulkDocs(transactions)
                    .then(function (docSR) {
                    _this.credStore.saveDataToFile(app_meta_1.LAST_UPD_TRANS_LIST_DATE_FILE_NAME, lastItemDate, function (err, resp) {
                        if (err) {
                            return callback(err, null);
                        }
                        if (resp) {
                            _this._getTransactionsLists(filter, credentials, callback);
                        }
                    });
                })
                    .catch(function (docSE) {
                    callback(docSE, null);
                });
            })
                .catch(function (e) {
                callback(e, null);
            });
        };
        return TransactionListSync;
    }());
    TransactionSync.TransactionListSync = TransactionListSync;
})(TransactionSync = exports.TransactionSync || (exports.TransactionSync = {}));
//# sourceMappingURL=transaction-sync.js.map