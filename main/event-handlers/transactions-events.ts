import { ORDER_SYNC_DB_NAME,
  TRANSACTIONS_LIST_SYNC_DB_NAME, TRANSACTIONS_SYNC_DB_NAME
} from '../app-meta';
import { FileStorage } from '../utils/in-memory-store/filestorage';
import { EventHandlerBase } from './event-handler-base';

import { Transaction, TransactionSaveResp } from '../models/transactions/transfers';
import { IOrder, OrdersSyncResponse, PrintData } from '../models/transactions/orders';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';
import { PrinterEvents } from './printer-events';

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

export class TransactionsEvents  extends EventHandlerBase {
  constructor(private _userDataPath: string, private userDBPath: string) {
    super();
  }

  // takes order and transfer data from client and saves it to
  // Local DB
  listenTransactionChange() {
    this.ipcMain.on('save-transaction', (event, arg) => {
      const transactionData: SaveTransactionRequest = <SaveTransactionRequest>arg;
      const credStore = new FileStorage(this._userDataPath);


      const ordersDb = new PouchDB(this.userDBPath + '/' + ORDER_SYNC_DB_NAME);
      const transactsDb = new PouchDB(this.userDBPath + '/' + TRANSACTIONS_SYNC_DB_NAME);

      const order = transactionData.order;
      order._id = order.id;
      order.isSynced = false;
      order.transferSynced = false;

      const transaction = transactionData.transferData;
      transaction._id = transaction.orderRef;
      transaction.isSynced = false;
      transaction.orderSynced = false;

      const printerEventListener = new PrinterEvents(this._userDataPath);

      ordersDb.put(order)
        .then(() => {
          return ordersDb.get(order._id);
        })
        .then((resp => {
          return transactsDb.put(transaction);
        }))
        .then((resp => {
        // performs order and transfer sync
          return new Promise((resolve, reject) => {
            credStore.getCredentials((credGetError, credentials) => {
              if (credGetError) {
                return reject({message: 'Error', Error: credGetError, status: 500});
              }

              try {
                credentials = JSON.parse(credentials);
                const transReq = new BgSyncRequests.TransactionSyncRequest(credentials);
                if (!transactionData.printData.isOnline) {
                  printerEventListener.sendToPrint(
                    this._userDataPath,
                    order.terminalId,
                    null,
                    'POST',
                    transactionData.printData,
                    transactionData.transferData.checkFiscal,
                    res => {
                      console.log('Printing result', res);
                    });
                }


                return transReq.saveOrder({offlineOrders: [order]})
                  .catch(orderErr => {
                    return reject({message: 'Error: error on save order', Error: orderErr, status: 500});
                  })
                  .then((orderResp) => {
                    const orderSaveResp: OrdersSyncResponse  = <OrdersSyncResponse>orderResp;
                    if (orderSaveResp) {
                      // http req errors
                      if (orderSaveResp.status) {
                        return reject({message: 'Error: error on save order', Error: orderSaveResp, status: status});
                      }

                      if (orderSaveResp.order_states && orderSaveResp.order_states.length) {
                        // save order to lDB as already synced
                        const docId = orderSaveResp.order_states[0].uid;

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
                        const isInvoiceCreated: boolean = orderSaveResp.order_states[0].created;
                        const invoiceRef = orderSaveResp.order_states[0].invoice_ref;
                        if (!isInvoiceCreated) {
                          return reject({message: 'Error', Error: orderSaveResp.order_states[0], status: 500});
                        }

                        const currentInvoiceId = orderSaveResp.order_states.find(item => item.uid === order._id).invoice_ref;


                        if (isInvoiceCreated && invoiceRef) {
                          // order saved succesfully if order request response contains
                          // invoiceRef and isInvoiceCreated is true
                          log.log(['Order Saved succesfully', orderSaveResp.order_states]);
                          return ordersDb.get(docId)
                            .then(d => {
                              // update doc, set that order synced flag to true
                              d.isSynced = isInvoiceCreated;
                              d.invoice_ref = orderSaveResp.order_states[0].invoice_ref;
                              d.transferSynced = false;
                              return ordersDb.put(d);
                            })
                            .then(r => {
                              return transactsDb.get(docId)
                                .then(trDoc => {
                                  trDoc.orderSynced = true;
                                  return transactsDb.put(trDoc);
                                });
                            })
                            .then(r => {
                              // do transaction sync
                              // save transfer to remote db and lDB as already synced
                              return transactsDb.get(order.id)
                                .then(dbTranResp => {
                                  return transReq.saveTransaction(dbTranResp)
                                    .catch(tranSaveErr => {
                                      return reject({message: 'Error: transaction save error',
                                        Error: tranSaveErr, status: 500});
                                    })
                                    .then((tranSaveResp) => {
                                      const tranResp: TransactionSaveResp = <TransactionSaveResp>tranSaveResp;
                                      printerEventListener.sendToPrint(
                                        this._userDataPath,
                                        order.terminalId,
                                        currentInvoiceId,
                                        'POST',
                                        transactionData.printData,
                                        transactionData.transferData.checkFiscal,
                                        res => {
                                          console.log('Printing result', res);
                                        });

                                      if (tranResp && tranResp.status === 401) {
                                        return reject({message: 'Error: auth error',
                                          Error: tranResp, status: tranResp.status});
                                      }

                                      if (tranResp && tranResp.status && tranResp.status === 200) {
                                        log.log(['Transfer Saved successfully', JSON.stringify(tranResp)]);
                                        return ordersDb.get(docId)
                                          .then(doc => {
                                            doc.transferSynced = true;
                                            return ordersDb.put(doc);
                                          })
                                          .then(osR => {
                                            return transactsDb.get(docId)
                                              .then(trDoc => {
                                                trDoc.isSynced = true;
                                                return transactsDb.put(trDoc);
                                              }).then(trSaveResp => {
                                                if (trSaveResp.ok) {
                                                  console.log('transaction synced', trSaveResp );
                                                  return resolve({message: 'Ok', details: trSaveResp, status: 201});
                                                }

                                                return reject({error: 'Error: not updated db after transaction synced successfully',
                                                  details: trSaveResp});
                                              }).catch(trErr => {
                                                return reject({message: 'Error', Error: trErr, status: 500});
                                              });
                                          })
                                          .catch(err => {
                                            return reject(err);
                                          });
                                      }
                                      return reject({message: 'Error: unhandled error', Error: tranSaveResp, status: 500});
                                  });
                              });
                            })
                            .catch(e => reject(e));
                        }
                      }
                    }
                  });
              } catch (e) {
                return reject({message: 'Error: json parse error', Error: e, status: 500});
              }
            });
          });
        }))
        .then(r => {
          console.log('transaction and order saved saved', r);
        })
        .catch((err) => {
          log.error(['Transaction request try error', err]);
        });

        event.sender.send('save-transaction-resp', { status: 1, message: 'OK' });
    });

    // transaction list by filter
    this.ipcMain.on('transaction-list-get', (evt, filter) => {
      const transactsDb = new PouchDB(this.userDBPath + '/' + TRANSACTIONS_LIST_SYNC_DB_NAME);
      const selector: any = {};

      selector.merchantId = filter.merchantId;

      if (filter.storeId && filter.storeId !== 'all') {
        selector.storeId = filter.storeId;
      }

      if (filter.transferType && filter.transferTypeExtra) {
        selector['$or'] = [
          {transferType: filter.transferType},
          {transferType: filter.transferTypeExtra},
        ];
      } else if (filter.transferType) {
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
        selector['invoiceId'] = {$regex: filter.invoiceId + '.'};
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

      const query: any = {};
      query.selector = selector;
      query.limit = filter.count;
      query.skip = filter.last;

      if (!filter.invoiceId) {
        query.sort = [{'createdDate': 'desc'}];
      }

      transactsDb.find(query)
      .then(r => {
        const resp: any = {
          data: r.docs,
        };

        return Promise.resolve(resp);
      }).then(r => {
        evt.sender.send('transaction-list-get-resp', r);
      }).catch(e => {
        evt.sender.send('transaction-list-get-resp', {message: 'Error', statue: 500, details: e});
      });
    });

    // get transactions count
    this.ipcMain.on('transaction-count-get', (evt, filter) => {
      const transactsDb = new PouchDB(this.userDBPath + '/' + TRANSACTIONS_LIST_SYNC_DB_NAME);

      const selector: any = {};

      selector.merchantId = filter.merchantId;

      if (filter.storeId && filter.storeId !== 'all') {
        selector.storeId = filter.storeId;
      }

      if (filter.transferType && filter.transferTypeExtra) {
        selector['$or'] = [
          {transferType: filter.transferType},
          {transferType: filter.transferTypeExtra},
        ];
      } else if (filter.transferType) {
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
        selector.invoiceId = {$regex: filter.invoiceId + '.'};
      }

      if (!filter.invoiceId && filter.from) {
        selector.createdDate = {
          $gte: new Date(filter.from),
        };
      }

      if (!filter.invoiceId && (filter.to && filter.from)) {
        selector.createdDate.$lt = new Date(filter.to);
      }

      const query: any = {};
      query.selector = selector;
      query.fields = ['_id'];
      transactsDb.find(query)
      .then(r => {
        const resp = {
          totalAmount: r.docs && r.docs.length ? r.docs.length : 0,
          status: 200,
        };
        evt.sender.send('transaction-count-get-resp', resp);
      }).catch(e => {
        console.log(e);
        evt.sender.send('transaction-count-get-resp', {message: 'Error', statue: 500, details: e});
      });
    });

    // get transaction by id and kassaId
    this.ipcMain.on('transaction-get-one', (evt, filter) => {
      const transactsDb = new PouchDB(this.userDBPath + '/' + TRANSACTIONS_LIST_SYNC_DB_NAME);
      const query = {
        selector: {
          id: filter.id,
        },
        limit: 10,
      };

      transactsDb.find(query).then(r => {
        if (r.docs && r.docs.length) {
          return evt.sender.send('transaction-get-one-resp', r.docs[0]);
        }
        evt.sender.send('transaction-get-one-resp', null);
      }).catch(e => {
        evt.sender.send('transaction-get-one-resp', null);
      });
    });
  }
}

interface SaveTransactionRequest {
  order: IOrder;
  transferData: Transaction;
  printData: PrintData;
}
