import * as http from 'https';
import * as querystring from 'querystring';

import { Request } from './request';
import { MerchantCredentials } from '../models/i-storage';
import { OrderSyncRequest } from '../models/transactions/orders';
import { TotalTransaction, Transaction } from '../models/transactions/transfers';

export namespace  BgSyncRequests {
  // webkassa sync
  export class WebkassaRequest {
    private readonly _credentials: MerchantCredentials;

    constructor(private credentials: MerchantCredentials) {
      this._credentials = this.credentials;
    }

    postWebkassaInfo(terminalId: string, invoiceId: string, operation_type: number) {
      if (this._isCredentialsValid()) {


        const hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
        let options: http.RequestOptions;
        options = {
          hostname: hostname,
          port: 443,
          path: `/${this._credentials.environmentData.outlet.version}/merchants/web/kassa/cheque?` +
          `terminal_id=${terminalId}&invoice_id=${invoiceId}&operation_type=${operation_type}`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          },
        };


        return new Promise(
          (resolve, reject) => {
            Request.post(options, {}, (err, resp) => {
              if (err) {
                reject(err);
              }
              resolve(resp);
            });
          },
        );
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while POSTING webkassa info'});
    }

    getWebkassaInfo(terminalId: string, invoiceId: string, operation_type: number) {
      if (this._isCredentialsValid()) {


        const hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
        let options: http.RequestOptions;
        options = {
          hostname: hostname,
          port: 443,
          path: `/${this._credentials.environmentData.outlet.version}/merchants/web/kassa/cheque?` +
          `terminal_id=${terminalId}&invoice_id=${invoiceId}&operation_type=${operation_type}`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          },
        };


        return new Promise(
          (resolve, reject) => {
            Request.get(options, (err, resp) => {
              if (err) {
                reject(err);
              }
              resolve(resp);
            });
          },
        );
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while getting webkassa info'});
    }


    private _isCredentialsValid() {
      return this._credentials && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
        && this._credentials.authCredentials.access_token
        && this._credentials.environmentData;
    }
  }

  // sync transactionData
  export class TransactionSyncRequest {
    private readonly _credentials: MerchantCredentials;

    constructor(private credentials: MerchantCredentials) {
      this._credentials = credentials;
    }

    getTransactionList(filter: any): Promise<TotalTransaction> {
      if (this._isCredentialsValid()) {
        filter.merchantId = this._credentials.authCredentials.merchantId;
        filter.sort = 'ASC';

        let options: http.RequestOptions;
        const hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];

        options = {
          hostname: hostname,
          port: 443,
          path: `/${this._credentials.environmentData.outlet.version}/fortekassa/cash-transfer/list`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          },
        };

        options.path = options.path + '?' + querystring.stringify(filter);

        return new Promise(
          (resolve, reject) => {
            Request.get(options, (err, resp) => {
              if (err) {
                reject(err);
              }
              resolve(resp);
            });
          },
        );
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while getting transaction list'});
    }

    saveOrder(order: OrderSyncRequest, callback?) {
      if (this._isCredentialsValid()) {
        let options: http.RequestOptions;
        const hostname = (this._credentials.environmentData.kassaApi.host.split('//'))[1];

        options = {
          hostname: hostname,
          port: 443,
          path: `/${this._credentials.environmentData.kassaApi.version}/shopping-cart/orders/sync/`,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (callback) {
          Request.post(options, order, (err, resp) => {
            callback(err, resp);
          });
          return;
        }

        return new Promise(
          (resolve, reject) => {
            Request.post(options, order, (err, resp) => {
              if (err) {
                reject(err);
              }
              resolve(resp);
            });
          },
        );
      }

      if (callback) {
        return callback(null, null);
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while saving order'});
    }

    saveTransaction(transaction: Transaction, callback?) {
      if (this._isCredentialsValid() && this._isWorkshiftIdExist()) {
        let options: http.RequestOptions;
        const hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
        const apiVer = this._credentials.environmentData.outlet.version;

        options = {
          hostname: hostname,
          port: 443,
          path: `/${apiVer}/fortekassa/${transaction.kassaId}/merchant/${transaction.merchantId}/store/${transaction.storeId}/transfer`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          },
        };

        if (callback) {
          Request.post(options, transaction, (err, resp) => {
            callback(err, resp);
          });
          return;
        }

        return new Promise((resolve, reject) => {
          Request.post(options, transaction, (err, resp) => {
            if (err) {
              reject(err);
            }

            resolve(resp);
          });
        });
      }

      if (callback) {
        return callback(null, null);
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while saving transfers to remote db'});
    }

    private _isCredentialsValid() {
      return this._credentials && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
        && this._credentials.authCredentials.access_token
        && this._credentials.environmentData;
    }

    private _isWorkshiftIdExist() {
      return this.credentials && this.credentials.currentWorkshift;
    }
  }
  // sync catgories
  export class CategoriesSyncRequest {
    constructor(private _credentials: MerchantCredentials) {
    }

    getCategoryList(filter, callback) {
      if (this._isCredentialsValid()) {
        this._getCategoriesRequest(filter, (err, resp) => {
          callback(err, resp);
        });
        return;
      }
      callback({message: 'Categories not valid', statue: 500}, null);
    }

    private _getCategoriesRequest(nomenFilter, callback) {
      let options: http.RequestOptions;
      const hostname = (this._credentials.environmentData.stock.host.split('//'))[1];
      console.log('making request to get categories', hostname);

      options = {
        hostname: hostname,
        port: 443,
        path: '/api/v4/groups/merchants',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          'X-Owner': 'MERCHANT##' + this._credentials.authCredentials.merchantId,
        },
      };

      nomenFilter.merchant_id = this._credentials.authCredentials.merchantId;
      nomenFilter.scope = 'darbiz';

      Request.post(options, nomenFilter, (err, resp) => {
        callback(err, resp);
      });
    }

    private _isCredentialsValid() {
      return this._credentials && this._credentials.outletData
        && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
        && this._credentials.authCredentials.access_token
        && this._credentials.environmentData;
    }
  }

  /* sync nomenclature */
  export class NomenclatureSyncRequest {

    constructor(private _credentials: MerchantCredentials) {}

    getNomenList(filter, callback) {
      if (this._isCredentialsValid()) {
        this._getNomenListRequest(filter, (err, resp) => {
          callback(err, resp);
        });
        return;
      }
      callback(null, null);
    }

    private _getNomenListRequest(nomenFilter, callback) {
      let options: http.RequestOptions;
      const hostname = (this._credentials.environmentData.stock.host.split('//'))[1];

      options = {
        hostname: hostname,
        port: 443,
        path: '/api/v4/products/nomenclature/filter',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          'X-Owner': 'MERCHANT##' + this._credentials.authCredentials.merchantId,
        },
      };

      nomenFilter.merchant_id = this._credentials.authCredentials.merchantId;
      nomenFilter.scope = 'fortekassa';

      Request.post(options, nomenFilter, (err, resp) => {
        callback(err, resp);
      });
    }

    private _isCredentialsValid() {
      return this._credentials && this._credentials.outletData && this._credentials.outletData.stockIds
        && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
        && this._credentials.authCredentials.access_token
        && this._credentials.environmentData;
    }
  }

  // sync favourite
  export class FavouriteListSyncRequest {

    constructor(private _credentials: MerchantCredentials) {}

    getFavouriteList(): Promise<{status?: number, products?: string[] }> {
      if (this._isCredentialsValid()) {
        let options: http.RequestOptions;
        const hostname = (this._credentials.environmentData.stock.host.split('//'))[1];

        options = {
          hostname: hostname,
          port: 443,
          path: '/api/v4/users/favorite/products?size=200&offset=0',
          headers: {
            'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
          },
        };

        return new Promise(
          (resolve, reject) => {
            Request.get(options, (err, resp) => {
              if (err) {
                reject(err);
              } else {
                resolve(resp);

              }
            });
          },
        );
      }

      return Promise.reject({message: 'not valid credentials or do not exist, while getting favourite list'});
    }

    private _isCredentialsValid() {
      return this._credentials && this._credentials.outletData && this._credentials.outletData.stockIds
        && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
        && this._credentials.authCredentials.access_token
        && this._credentials.environmentData;
    }
  }
}
