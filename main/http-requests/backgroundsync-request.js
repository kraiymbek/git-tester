"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var querystring = require("querystring");
var request_1 = require("./request");
var BgSyncRequests;
(function (BgSyncRequests) {
    // webkassa sync
    var WebkassaRequest = /** @class */ (function () {
        function WebkassaRequest(credentials) {
            this.credentials = credentials;
            this._credentials = this.credentials;
        }
        WebkassaRequest.prototype.postWebkassaInfo = function (terminalId, invoiceId, operation_type) {
            if (this._isCredentialsValid()) {
                var hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
                var options_1;
                options_1 = {
                    hostname: hostname,
                    port: 443,
                    path: "/" + this._credentials.environmentData.outlet.version + "/merchants/web/kassa/cheque?" +
                        ("terminal_id=" + terminalId + "&invoice_id=" + invoiceId + "&operation_type=" + operation_type),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
                    },
                };
                return new Promise(function (resolve, reject) {
                    request_1.Request.post(options_1, {}, function (err, resp) {
                        if (err) {
                            reject(err);
                        }
                        resolve(resp);
                    });
                });
            }
            return Promise.reject({ message: 'not valid credentials or do not exist, while POSTING webkassa info' });
        };
        WebkassaRequest.prototype.getWebkassaInfo = function (terminalId, invoiceId, operation_type) {
            if (this._isCredentialsValid()) {
                var hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
                var options_2;
                options_2 = {
                    hostname: hostname,
                    port: 443,
                    path: "/" + this._credentials.environmentData.outlet.version + "/merchants/web/kassa/cheque?" +
                        ("terminal_id=" + terminalId + "&invoice_id=" + invoiceId + "&operation_type=" + operation_type),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
                    },
                };
                return new Promise(function (resolve, reject) {
                    request_1.Request.get(options_2, function (err, resp) {
                        if (err) {
                            reject(err);
                        }
                        resolve(resp);
                    });
                });
            }
            return Promise.reject({ message: 'not valid credentials or do not exist, while getting webkassa info' });
        };
        WebkassaRequest.prototype._isCredentialsValid = function () {
            return this._credentials && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
                && this._credentials.authCredentials.access_token
                && this._credentials.environmentData;
        };
        return WebkassaRequest;
    }());
    BgSyncRequests.WebkassaRequest = WebkassaRequest;
    // sync transactionData
    var TransactionSyncRequest = /** @class */ (function () {
        function TransactionSyncRequest(credentials) {
            this.credentials = credentials;
            this._credentials = credentials;
        }
        TransactionSyncRequest.prototype.getTransactionList = function (filter) {
            if (this._isCredentialsValid()) {
                filter.merchantId = this._credentials.authCredentials.merchantId;
                filter.sort = 'ASC';
                var options_3;
                var hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
                options_3 = {
                    hostname: hostname,
                    port: 443,
                    path: "/" + this._credentials.environmentData.outlet.version + "/fortekassa/cash-transfer/list",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
                    },
                };
                options_3.path = options_3.path + '?' + querystring.stringify(filter);
                return new Promise(function (resolve, reject) {
                    request_1.Request.get(options_3, function (err, resp) {
                        if (err) {
                            reject(err);
                        }
                        resolve(resp);
                    });
                });
            }
            return Promise.reject({ message: 'not valid credentials or do not exist, while getting transaction list' });
        };
        TransactionSyncRequest.prototype.saveOrder = function (order, callback) {
            if (this._isCredentialsValid()) {
                var options_4;
                var hostname = (this._credentials.environmentData.kassaApi.host.split('//'))[1];
                options_4 = {
                    hostname: hostname,
                    port: 443,
                    path: "/" + this._credentials.environmentData.kassaApi.version + "/shopping-cart/orders/sync/",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };
                if (callback) {
                    request_1.Request.post(options_4, order, function (err, resp) {
                        callback(err, resp);
                    });
                    return;
                }
                return new Promise(function (resolve, reject) {
                    request_1.Request.post(options_4, order, function (err, resp) {
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
            return Promise.reject({ message: 'not valid credentials or do not exist, while saving order' });
        };
        TransactionSyncRequest.prototype.saveTransaction = function (transaction, callback) {
            if (this._isCredentialsValid() && this._isWorkshiftIdExist()) {
                var options_5;
                var hostname = (this._credentials.environmentData.outlet.host.split('//'))[1];
                var apiVer = this._credentials.environmentData.outlet.version;
                options_5 = {
                    hostname: hostname,
                    port: 443,
                    path: "/" + apiVer + "/fortekassa/" + transaction.kassaId + "/merchant/" + transaction.merchantId + "/store/" + transaction.storeId + "/transfer",
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
                    },
                };
                if (callback) {
                    request_1.Request.post(options_5, transaction, function (err, resp) {
                        callback(err, resp);
                    });
                    return;
                }
                return new Promise(function (resolve, reject) {
                    request_1.Request.post(options_5, transaction, function (err, resp) {
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
            return Promise.reject({ message: 'not valid credentials or do not exist, while saving transfers to remote db' });
        };
        TransactionSyncRequest.prototype._isCredentialsValid = function () {
            return this._credentials && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
                && this._credentials.authCredentials.access_token
                && this._credentials.environmentData;
        };
        TransactionSyncRequest.prototype._isWorkshiftIdExist = function () {
            return this.credentials && this.credentials.currentWorkshift;
        };
        return TransactionSyncRequest;
    }());
    BgSyncRequests.TransactionSyncRequest = TransactionSyncRequest;
    // sync catgories
    var CategoriesSyncRequest = /** @class */ (function () {
        function CategoriesSyncRequest(_credentials) {
            this._credentials = _credentials;
        }
        CategoriesSyncRequest.prototype.getCategoryList = function (filter, callback) {
            if (this._isCredentialsValid()) {
                this._getCategoriesRequest(filter, function (err, resp) {
                    callback(err, resp);
                });
                return;
            }
            callback({ message: 'Categories not valid', statue: 500 }, null);
        };
        CategoriesSyncRequest.prototype._getCategoriesRequest = function (nomenFilter, callback) {
            var options;
            var hostname = (this._credentials.environmentData.stock.host.split('//'))[1];
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
            request_1.Request.post(options, nomenFilter, function (err, resp) {
                callback(err, resp);
            });
        };
        CategoriesSyncRequest.prototype._isCredentialsValid = function () {
            return this._credentials && this._credentials.outletData
                && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
                && this._credentials.authCredentials.access_token
                && this._credentials.environmentData;
        };
        return CategoriesSyncRequest;
    }());
    BgSyncRequests.CategoriesSyncRequest = CategoriesSyncRequest;
    /* sync nomenclature */
    var NomenclatureSyncRequest = /** @class */ (function () {
        function NomenclatureSyncRequest(_credentials) {
            this._credentials = _credentials;
        }
        NomenclatureSyncRequest.prototype.getNomenList = function (filter, callback) {
            if (this._isCredentialsValid()) {
                this._getNomenListRequest(filter, function (err, resp) {
                    callback(err, resp);
                });
                return;
            }
            callback(null, null);
        };
        NomenclatureSyncRequest.prototype._getNomenListRequest = function (nomenFilter, callback) {
            var options;
            var hostname = (this._credentials.environmentData.stock.host.split('//'))[1];
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
            request_1.Request.post(options, nomenFilter, function (err, resp) {
                callback(err, resp);
            });
        };
        NomenclatureSyncRequest.prototype._isCredentialsValid = function () {
            return this._credentials && this._credentials.outletData && this._credentials.outletData.stockIds
                && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
                && this._credentials.authCredentials.access_token
                && this._credentials.environmentData;
        };
        return NomenclatureSyncRequest;
    }());
    BgSyncRequests.NomenclatureSyncRequest = NomenclatureSyncRequest;
    // sync favourite
    var FavouriteListSyncRequest = /** @class */ (function () {
        function FavouriteListSyncRequest(_credentials) {
            this._credentials = _credentials;
        }
        FavouriteListSyncRequest.prototype.getFavouriteList = function () {
            if (this._isCredentialsValid()) {
                var options_6;
                var hostname = (this._credentials.environmentData.stock.host.split('//'))[1];
                options_6 = {
                    hostname: hostname,
                    port: 443,
                    path: '/api/v4/users/favorite/products?size=200&offset=0',
                    headers: {
                        'Authorization': 'Bearer ' + this._credentials.authCredentials.access_token,
                    },
                };
                return new Promise(function (resolve, reject) {
                    request_1.Request.get(options_6, function (err, resp) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(resp);
                        }
                    });
                });
            }
            return Promise.reject({ message: 'not valid credentials or do not exist, while getting favourite list' });
        };
        FavouriteListSyncRequest.prototype._isCredentialsValid = function () {
            return this._credentials && this._credentials.outletData && this._credentials.outletData.stockIds
                && this._credentials.authCredentials && this._credentials.authCredentials.merchantId
                && this._credentials.authCredentials.access_token
                && this._credentials.environmentData;
        };
        return FavouriteListSyncRequest;
    }());
    BgSyncRequests.FavouriteListSyncRequest = FavouriteListSyncRequest;
})(BgSyncRequests = exports.BgSyncRequests || (exports.BgSyncRequests = {}));
//# sourceMappingURL=backgroundsync-request.js.map