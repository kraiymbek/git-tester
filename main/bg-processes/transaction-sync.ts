import {
  IOrder,
  OrderSaveState,
  OrdersSyncResponse } from '../models/transactions/orders';
import { FileStorage } from '../utils/in-memory-store/filestorage';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';
import { Transaction } from '../models/transactions/transfers';
import {
  INITIAL_TRANSLIST_SYNC_DATE,
  LAST_UPD_TRANS_LIST_DATE_FILE_NAME,
  ORDER_SYNC_DB_NAME,
  TRANSACTIONS_LIST_SYNC_DB_NAME,
  TRANSACTIONS_SYNC_DB_NAME,
} from '../app-meta';
import { MerchantCredentials } from '../models/i-storage';

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

export namespace TransactionSync {
  export class TransactionTransferSync {
    credStore: FileStorage;
    ordersDb: typeof PouchDB;
    transactsDb: typeof PouchDB;

    constructor(private _storePath: string, private _userDBPath: string) {
      this.credStore = new FileStorage(this._storePath);
      this.ordersDb = new PouchDB(this._userDBPath + '/' + ORDER_SYNC_DB_NAME);
      this.transactsDb = new PouchDB(this._userDBPath + '/' + TRANSACTIONS_SYNC_DB_NAME);
    }

    start(cb?) {
      this.credStore.getCredentials((credGetError, credentials) => {
        if (credGetError) {
          return log.error(['Error getting credentials from file system']);
        }

        try {
          credentials = JSON.parse(credentials);
          // check if credentials for current user are valid
          if (this._isCredentialsValid(credentials) && this._isWorkshiftIdExist(credentials)) {
            this.transactsDb.find({
              selector: {
                isSynced: false,
                orderSynced: true,
              },
            }).then(r => {
              console.log('transaction to be synced', r);
              // sync transactions
              // records orders and transaction db as synced
              return this._saveTransferRemote(r.docs, credentials);
            }).then(r => {
              if (cb) {
                cb(null, r);
              }
              return log.debug(['transaction sync ended successfully see details: ', r]);
            }).catch(err => {
              if (cb) {
                cb(err, null);
              }
              return log.error(['error while saving transactions see details:', err]);
            });
          } else {
            const err = 'Error saving transaction. credentials not valid';
            if (cb) {
              cb(err, null);
            }
            return log.error([err]);
          }
        } catch (e) {
          if (cb) {
            cb(e, null);
          }
          return log.error(['Error when parsing credentials', e]);
        }
      });
    }

    private _isCredentialsValid(credentials: MerchantCredentials) {
      return credentials && credentials.authCredentials && credentials.authCredentials.merchantId
        && credentials.authCredentials.access_token
        && credentials.environmentData;
    }

    private _isWorkshiftIdExist(credentials: MerchantCredentials) {
      return credentials && credentials.currentWorkshift;
    }

    private _saveTransferRemote(transactions: Transaction[], credentials: MerchantCredentials) {
      const transReq = new BgSyncRequests.TransactionSyncRequest(credentials);

      return Promise.all(transactions.map(transaction => {
        transaction.workShiftId = credentials.currentWorkshift;
        return transReq.saveTransaction(transaction)
          .then(r => {
            if (r && r.status === 401) {
              return Promise.reject({message: 'Not authorized to perform transaction request'});
            }

            if (r && r.status === 200) {
              return this.transactsDb.get(transaction.orderRef)
                .then(doc => {
                  doc.isSynced = true;
                  return this.transactsDb.put(doc);
                })
                .then(saveR => {
                  if (saveR.ok) {
                    console.log('transaction marking done');
                    return this.ordersDb.get(transaction.orderRef);
                  }
                  return Promise.reject({message: 'Expected success. ' +
                      'But got error updating synced mark on transaction', dataToLog: transaction, needLog: true});
                })
                .then(order => {
                  if (order.isSynced) {
                    order.transferSynced = true;
                    return this.ordersDb.put(order);
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
                .then(orderres => {
                  if (orderres.ok) {
                    console.log('order marking done');
                    return Promise.resolve({
                      status: 200,
                      message: 'Transaction successfully transfered and lDB for order and transaction' + transaction.orderRef});
                  }
                })
                .catch(e => {
                  return Promise.reject({message: 'Got lDB error updating synced mark on transaction',
                    dataToLog: {transaction: transaction, details: e}, needLog: true});
                });
            }
            return new Promise(resolve => resolve({message: 'uncought error', details: r, needLog: true, error: true}));
          });
      }));
    }
  }

  export class TransactionOrderSync {
    credStore: FileStorage;
    ordersDb: typeof PouchDB;
    transactsDb: typeof PouchDB;

    constructor(private _storePath: string, private _userDBPath: string) {
      this.credStore = new FileStorage(this._storePath);
      this.ordersDb = new PouchDB(this._userDBPath + '/' + ORDER_SYNC_DB_NAME);
      this.transactsDb = new PouchDB(this._userDBPath + '/' + TRANSACTIONS_SYNC_DB_NAME);
    }

    start() {
      this.credStore.getCredentials((credGetError, credentials) => {
        if (credGetError) {
          return log.error(['error getting credentials', credGetError]);
        }

        this.ordersDb.find({
          selector: {
            isSynced: false,
          },
        }).then(r => {
          // catch json parse error
          if (r.docs && r.docs.length) {
            try {
              credentials = JSON.parse(credentials);
              const orders: IOrder[] = <IOrder[]>r.docs;
              return this._saveOrdersToRemoteDB(orders, credentials);
            } catch (e) {
              return Promise.reject({message: e});
            }
          }
          return Promise.reject({message: 'There is not any records to be synced in orders lDB', status: 404});
        }).then(orderSaveR => {
          const orderSaveResp: OrdersSyncResponse  = <OrdersSyncResponse>orderSaveR;

          if (orderSaveResp && orderSaveResp.status) {
            return Promise.reject({message: 'some error accured while saving to remote db', details: orderSaveResp});
          }

          // mark as synced every order and then save transaction
          if (orderSaveResp && orderSaveResp.order_states && orderSaveResp.order_states.length) {
            return this._markOrderAndTransferAsSynced(orderSaveResp.order_states);
          }
        }).then(r => {
          log.log('done sync process successfully');
        }).catch(err => {
          log.error(['error while syncing process. Details below', err]);
        });
      });
    }

    private _saveOrdersToRemoteDB(orders: IOrder[], credentials) {
      const transReq = new BgSyncRequests.TransactionSyncRequest(credentials);
      return transReq.saveOrder({offlineOrders: orders});
    }

    /*
    * after order synced, marks as orderSynced in
    * order and transfer records in lDB as synced
    * */
    private _markOrderAndTransferAsSynced(order_states: OrderSaveState[]) {
      return Promise.all(order_states.map(state => {
        const docId = state.uid;
        const isCreated = state.created;
        const invoiceRef = state.invoice_ref ? state.invoice_ref : '';

        return this.ordersDb.get(docId)
          .then(d  => {
            d.isSynced = isCreated;
            d.invoiceRef = invoiceRef;
            return this.ordersDb.put(d);
          }).then(r => {
            // save to transaction
            return this.transactsDb.get(docId);
          }).then(r => {
            r.orderSynced = isCreated;
            return this.transactsDb.put(r);
          }).catch(e => {
            return Promise.reject(e);
          });
      }));
    }
  }
  export class TransactionListSync {
    private static _instance: TransactionListSync;

    private isSyncing = false;

    db: typeof PouchDB;
    credStore: FileStorage;
    transactListDb: typeof PouchDB;

    private constructor(private _storePath, private _ldbPath) {
      this.credStore = new FileStorage(this._storePath);
      this.transactListDb = new PouchDB(this._ldbPath + '/' + TRANSACTIONS_LIST_SYNC_DB_NAME);
    }

    public static getInstace(_storePath, _ldbPath): TransactionListSync {
      if (!this._instance) {
        this._instance = new TransactionListSync(_storePath, _ldbPath);
      }
      return this._instance;
    }

    public static stop() {
      this._instance = null;
    }

    startListSync() {
      this.credStore.getCredentials((credGetError, credentials) => {
        if (credGetError) {
          return log.error(['error getting credentials', credGetError]);
        }

        try {
          credentials = JSON.parse(credentials);
          const filter = {
            count: 50,
            last: 0,
          };

          if (this.isSyncing) {
            return;
          }

          this.isSyncing = true;
          this._getData(filter, credentials);
        } catch (e) {
          this.isSyncing = false;
          log.error(['credentials parse error while transaction list sync', e]);
        }
      });
    }

    private _getData(filter, credentials) {
      this.credStore.getDataFromFile(LAST_UPD_TRANS_LIST_DATE_FILE_NAME, (errRead, date) => {
        if (errRead) {
          filter['from'] = INITIAL_TRANSLIST_SYNC_DATE;
        }

        if (date) {
          try {
            date = JSON.parse(date);
            filter['from'] = date.lastUpdatedDate;
          } catch (e) {
            filter['from'] = INITIAL_TRANSLIST_SYNC_DATE;
            log.error(['Error parsing tranactions date: details - ' + date, e]);
          }
        }

        console.log('transactions sync list started from date - ', filter.from);
        this._getTransactionsLists(filter, credentials, (err, resp) => {
          if (err) {
            log.error(['error saving trans list', err]);
          }
          this.isSyncing = false;
        });
      });
    }

    private _getTransactionsLists(filter, credentials, callback) {
      const transReq = new BgSyncRequests.TransactionSyncRequest(credentials);
      transReq.getTransactionList(filter)
        .then(r => {
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
            return callback({message: 'Error: Not found', Error: r, status: 404}, null);
          }

          const transactions: Transaction[] = <Transaction[]>r.data;
          filter.from =  transactions[transactions.length - 1].createdDate;

          const lastItemDate = {
            lastUpdatedDate: filter.from,
            lastUpdatedItem: transactions[transactions.length - 1],
          };

          this.transactListDb.createIndex({
            index: {
              fields: ['createdDate'],
              name: 'createdDateIdx',
            },
          }).then(function (result) {}).catch(function (err) {});

          this.transactListDb.bulkDocs(transactions)
            .then(docSR => {
               this.credStore.saveDataToFile(LAST_UPD_TRANS_LIST_DATE_FILE_NAME , lastItemDate, (err, resp) => {
                if (err) {
                  return callback(err, null);
                }
                if (resp) {
                  this._getTransactionsLists(filter, credentials, callback);
                }
              });
            })
            .catch(docSE => {
              callback(docSE, null);
            });
        })
        .catch(e => {
          callback(e, null);
        });
    }
  }
}
