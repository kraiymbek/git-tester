"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var app_meta_1 = require("../app-meta");
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var event_handler_base_1 = require("./event-handler-base");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var printer_events_1 = require("./printer-events");
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var TransactionsEvents = /** @class */ (function (_super) {
    __extends(TransactionsEvents, _super);
    function TransactionsEvents(_userDataPath, userDBPath) {
        var _this = _super.call(this) || this;
        _this._userDataPath = _userDataPath;
        _this.userDBPath = userDBPath;
        return _this;
    }
    // takes order and transfer data from client and saves it to
    // Local DB
    TransactionsEvents.prototype.listenTransactionChange = function () {
        var _this = this;
        this.ipcMain.on('save-transaction', function (event, arg) {
            var transactionData = arg;
            var credStore = new filestorage_1.FileStorage(_this._userDataPath);
            var ordersDb = new PouchDB(_this.userDBPath + '/' + app_meta_1.ORDER_SYNC_DB_NAME);
            var transactsDb = new PouchDB(_this.userDBPath + '/' + app_meta_1.TRANSACTIONS_SYNC_DB_NAME);
            var order = transactionData.order;
            order._id = order.id;
            order.isSynced = false;
            order.transferSynced = false;
            var transaction = transactionData.transferData;
            transaction._id = transaction.orderRef;
            transaction.isSynced = false;
            transaction.orderSynced = false;
            var printerEventListener = new printer_events_1.PrinterEvents(_this._userDataPath);
            ordersDb.put(order)
                .then(function () {
                return ordersDb.get(order._id);
            })
                .then((function (resp) {
                return transactsDb.put(transaction);
            }))
                .then((function (resp) {
                // performs order and transfer sync
                return new Promise(function (resolve, reject) {
                    credStore.getCredentials(function (credGetError, credentials) {
                        if (credGetError) {
                            return reject({ message: 'Error', Error: credGetError, status: 500 });
                        }
                        try {
                            credentials = JSON.parse(credentials);
                            var transReq_1 = new backgroundsync_request_1.BgSyncRequests.TransactionSyncRequest(credentials);
                            if (!transactionData.printData.isOnline) {
                                printerEventListener.sendToPrint(_this._userDataPath, order.terminalId, null, 'POST', transactionData.printData, transactionData.transferData.checkFiscal, function (res) {
                                    console.log('Printing result', res);
                                });
                            }
                            return transReq_1.saveOrder({ offlineOrders: [order] })
                                .catch(function (orderErr) {
                                return reject({ message: 'Error: error on save order', Error: orderErr, status: 500 });
                            })
                                .then(function (orderResp) {
                                var orderSaveResp = orderResp;
                                if (orderSaveResp) {
                                    // http req errors
                                    if (orderSaveResp.status) {
                                        return reject({ message: 'Error: error on save order', Error: orderSaveResp, status: status });
                                    }
                                    if (orderSaveResp.order_states && orderSaveResp.order_states.length) {
                                        // save order to lDB as already synced
                                        var docId_1 = orderSaveResp.order_states[0].uid;
                                        /*
                                        * @isInvoiceCreated determines id invoice for order creates
                                        * if false then resend order until it creates invoice
                                        * @invoiceRef - invoice id, is created when order invoice created.
                                        * invoiceRef - if does not exits, then cron scheduler
                                        * resends order to create invoice
                                        *
                                        * RESENDing of orders done in cron scheduler process
                                        * */
                                        // take 0 index data, because offlineOrders on remote order save
                                        // takes only one order object
                                        var isInvoiceCreated_1 = orderSaveResp.order_states[0].created;
                                        var invoiceRef = orderSaveResp.order_states[0].invoice_ref;
                                        if (!isInvoiceCreated_1) {
                                            return reject({ message: 'Error', Error: orderSaveResp.order_states[0], status: 500 });
                                        }
                                        var currentInvoiceId_1 = orderSaveResp.order_states.find(function (item) { return item.uid === order._id; }).invoice_ref;
                                        if (isInvoiceCreated_1 && invoiceRef) {
                                            // order saved succesfully if order request response contains
                                            // invoiceRef and isInvoiceCreated is true
                                            log.log(['Order Saved succesfully', orderSaveResp.order_states]);
                                            return ordersDb.get(docId_1)
                                                .then(function (d) {
                                                // update doc, set that order synced flag to true
                                                d.isSynced = isInvoiceCreated_1;
                                                d.invoice_ref = orderSaveResp.order_states[0].invoice_ref;
                                                d.transferSynced = false;
                                                return ordersDb.put(d);
                                            })
                                                .then(function (r) {
                                                return transactsDb.get(docId_1)
                                                    .then(function (trDoc) {
                                                    trDoc.orderSynced = true;
                                                    return transactsDb.put(trDoc);
                                                });
                                            })
                                                .then(function (r) {
                                                // do transaction sync
                                                // save transfer to remote db and lDB as already synced
                                                return transactsDb.get(order.id)
                                                    .then(function (dbTranResp) {
                                                    return transReq_1.saveTransaction(dbTranResp)
                                                        .catch(function (tranSaveErr) {
                                                        return reject({ message: 'Error: transaction save error',
                                                            Error: tranSaveErr, status: 500 });
                                                    })
                                                        .then(function (tranSaveResp) {
                                                        var tranResp = tranSaveResp;
                                                        printerEventListener.sendToPrint(_this._userDataPath, order.terminalId, currentInvoiceId_1, 'POST', transactionData.printData, transactionData.transferData.checkFiscal, function (res) {
                                                            console.log('Printing result', res);
                                                        });
                                                        if (tranResp && tranResp.status === 401) {
                                                            return reject({ message: 'Error: auth error',
                                                                Error: tranResp, status: tranResp.status });
                                                        }
                                                        if (tranResp && tranResp.status && tranResp.status === 200) {
                                                            log.log(['Transfer Saved successfully', JSON.stringify(tranResp)]);
                                                            return ordersDb.get(docId_1)
                                                                .then(function (doc) {
                                                                doc.transferSynced = true;
                                                                return ordersDb.put(doc);
                                                            })
                                                                .then(function (osR) {
                                                                return transactsDb.get(docId_1)
                                                                    .then(function (trDoc) {
                                                                    trDoc.isSynced = true;
                                                                    return transactsDb.put(trDoc);
                                                                }).then(function (trSaveResp) {
                                                                    if (trSaveResp.ok) {
                                                                        console.log('transaction synced', trSaveResp);
                                                                        return resolve({ message: 'Ok', details: trSaveResp, status: 201 });
                                                                    }
                                                                    return reject({ error: 'Error: not updated db after transaction synced successfully',
                                                                        details: trSaveResp });
                                                                }).catch(function (trErr) {
                                                                    return reject({ message: 'Error', Error: trErr, status: 500 });
                                                                });
                                                            })
                                                                .catch(function (err) {
                                                                return reject(err);
                                                            });
                                                        }
                                                        return reject({ message: 'Error: unhandled error', Error: tranSaveResp, status: 500 });
                                                    });
                                                });
                                            })
                                                .catch(function (e) { return reject(e); });
                                        }
                                    }
                                }
                            });
                        }
                        catch (e) {
                            return reject({ message: 'Error: json parse error', Error: e, status: 500 });
                        }
                    });
                });
            }))
                .then(function (r) {
                console.log('transaction and order saved saved', r);
            })
                .catch(function (err) {
                log.error(['Transaction request try error', err]);
            });
            event.sender.send('save-transaction-resp', { status: 1, message: 'OK' });
        });
        // transaction list by filter
        this.ipcMain.on('transaction-list-get', function (evt, filter) {
            var transactsDb = new PouchDB(_this.userDBPath + '/' + app_meta_1.TRANSACTIONS_LIST_SYNC_DB_NAME);
            var selector = {};
            selector.merchantId = filter.merchantId;
            if (filter.storeId && filter.storeId !== 'all') {
                selector.storeId = filter.storeId;
            }
            if (filter.transferType && filter.transferTypeExtra) {
                selector['$or'] = [
                    { transferType: filter.transferType },
                    { transferType: filter.transferTypeExtra },
                ];
            }
            else if (filter.transferType) {
                selector.transferType = filter.transferType;
            }
            if (filter.kassaId) {
                selector.kassaId = filter.kassaId;
            }
            if (filter.cashierId) {
                selector.cashierId = filter.cashierId;
            }
            if (filter.fiscalization) {
                selector.checkFiscal = filter.fiscalization;
            }
            if (filter.paymentType) {
                selector['invoice.paymentType'] = filter.paymentType;
            }
            if (filter.invoiceId) {
                selector['invoiceId'] = { $regex: filter.invoiceId + '.' };
            }
            if (filter.fiscalization) {
                selector.checkFiscal = filter.fiscalization;
            }
            if (!filter.invoiceId && filter.from) {
                selector.createdDate = {
                    $gte: new Date(filter.from),
                };
            }
            if (!filter.invoiceId && (filter.to && filter.from)) {
                selector.createdDate.$lt = new Date(filter.to);
            }
            var query = {};
            query.selector = selector;
            query.limit = filter.count;
            query.skip = filter.last;
            if (!filter.invoiceId) {
                query.sort = [{ 'createdDate': 'desc' }];
            }
            transactsDb.find(query)
                .then(function (r) {
                var resp = {
                    data: r.docs,
                };
                return Promise.resolve(resp);
            }).then(function (r) {
                evt.sender.send('transaction-list-get-resp', r);
            }).catch(function (e) {
                evt.sender.send('transaction-list-get-resp', { message: 'Error', statue: 500, details: e });
            });
        });
        // get transactions count
        this.ipcMain.on('transaction-count-get', function (evt, filter) {
            var transactsDb = new PouchDB(_this.userDBPath + '/' + app_meta_1.TRANSACTIONS_LIST_SYNC_DB_NAME);
            var selector = {};
            selector.merchantId = filter.merchantId;
            if (filter.storeId && filter.storeId !== 'all') {
                selector.storeId = filter.storeId;
            }
            if (filter.transferType && filter.transferTypeExtra) {
                selector['$or'] = [
                    { transferType: filter.transferType },
                    { transferType: filter.transferTypeExtra },
                ];
            }
            else if (filter.transferType) {
                selector.transferType = filter.transferType;
            }
            if (filter.kassaId) {
                selector.kassaId = filter.kassaId;
            }
            if (filter.cashierId) {
                selector.cashierId = filter.cashierId;
            }
            if (filter.fiscalization) {
                selector.checkFiscal = filter.fiscalization;
            }
            if (filter.invoiceId) {
                selector.invoiceId = { $regex: filter.invoiceId + '.' };
            }
            if (!filter.invoiceId && filter.from) {
                selector.createdDate = {
                    $gte: new Date(filter.from),
                };
            }
            if (!filter.invoiceId && (filter.to && filter.from)) {
                selector.createdDate.$lt = new Date(filter.to);
            }
            var query = {};
            query.selector = selector;
            query.fields = ['_id'];
            transactsDb.find(query)
                .then(function (r) {
                var resp = {
                    totalAmount: r.docs && r.docs.length ? r.docs.length : 0,
                    status: 200,
                };
                evt.sender.send('transaction-count-get-resp', resp);
            }).catch(function (e) {
                console.log(e);
                evt.sender.send('transaction-count-get-resp', { message: 'Error', statue: 500, details: e });
            });
        });
        // get transaction by id and kassaId
        this.ipcMain.on('transaction-get-one', function (evt, filter) {
            var transactsDb = new PouchDB(_this.userDBPath + '/' + app_meta_1.TRANSACTIONS_LIST_SYNC_DB_NAME);
            var query = {
                selector: {
                    id: filter.id,
                },
                limit: 10,
            };
            transactsDb.find(query).then(function (r) {
                if (r.docs && r.docs.length) {
                    return evt.sender.send('transaction-get-one-resp', r.docs[0]);
                }
                evt.sender.send('transaction-get-one-resp', null);
            }).catch(function (e) {
                evt.sender.send('transaction-get-one-resp', null);
            });
        });
    };
    return TransactionsEvents;
}(event_handler_base_1.EventHandlerBase));
exports.TransactionsEvents = TransactionsEvents;
//# sourceMappingURL=transactions-events.js.map