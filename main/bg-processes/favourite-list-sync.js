"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var app_meta_1 = require("../app-meta");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var FavouriteListSync = /** @class */ (function () {
    // number of synced items
    function FavouriteListSync(_storePath, _ldbPath) {
        this._storePath = _storePath;
        this._ldbPath = _ldbPath;
        this.credStore = new filestorage_1.FileStorage(this._storePath);
    }
    FavouriteListSync.prototype.start = function () {
        var _this = this;
        this.db = new PouchDB(this._ldbPath + '/' + app_meta_1.FAVOURITE_LIST_SYNC_DB_NAME);
        this.credStore.getCredentials(function (credGetError, credentials) {
            console.log('----- Starting cron to get favourite list at - ' + new Date());
            if (credGetError) {
                console.log('error getting credentials', credGetError);
                return;
            }
            _this._getFavouriteList(credentials, function (err, resp) {
                console.log(err, resp);
                // if everything is ok, then reset counters
                if (resp) {
                }
            });
        });
    };
    FavouriteListSync.prototype._getFavouriteList = function (credentials, callback) {
        var _this = this;
        // starting fav-list sync
        try {
            credentials = JSON.parse(credentials);
            var bgSync = new backgroundsync_request_1.BgSyncRequests.FavouriteListSyncRequest(credentials);
            bgSync.getFavouriteList()
                .then(function (r) {
                if (r && r.status && r.status === 401) {
                    return callback(r, null);
                }
                if (r && r['status'] === 404) {
                    return callback(r, null);
                }
                if (r && r['status'] === 500) {
                    return callback(r, null);
                }
                if (r && r['status']) {
                    return callback(r, null);
                }
                if (!(r['products'] && r['products'].length)) {
                    return callback({ message: 'Not found', Details: r, status: 404 }, null);
                }
                if (r && r['products']) {
                    _this._saveFavouriteListToLocalDb(r['products'])
                        .then(function (sR) {
                        callback(null, true);
                    })
                        .catch(function (e) {
                        callback(e, null);
                    });
                }
                else {
                    return callback({ message: 'Some error accured while getting list of categories', details: r, status: 500 }, null);
                }
            })
                .catch(function (e) {
                console.log('fav list get error', e);
            });
        }
        catch (e) {
            log.error(['Error on getting nomenclature favorite list', e]);
            callback(e, null);
        }
    };
    FavouriteListSync.prototype._saveFavouriteListToLocalDb = function (uids) {
        var _this = this;
        var favProducts = { products: uids };
        return this.db.get('favorite-products')
            .then(function (r) {
            favProducts._id = r._id;
            favProducts._rev = r._rev;
            return _this.db.put(favProducts);
        })
            .catch(function (e) {
            console.log('create fav', e);
            favProducts._id = 'favorite-products';
            return _this.db.put(favProducts);
        })
            .catch(function (e) {
            return Promise.reject({ message: 'Error on updating fav list', cat: favProducts, status: 500, details: e });
        })
            .then(function (r) {
            return Promise.resolve({ message: 'Records for favorite products are successfully updated.', status: 202 });
        });
    };
    return FavouriteListSync;
}());
exports.FavouriteListSync = FavouriteListSync;
//# sourceMappingURL=favourite-list-sync.js.map