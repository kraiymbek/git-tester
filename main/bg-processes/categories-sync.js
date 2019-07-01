"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var app_meta_1 = require("../app-meta");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var CategoriesSync = /** @class */ (function () {
    // number of synced items
    function CategoriesSync(_storePath, _ldbPath) {
        this._storePath = _storePath;
        this._ldbPath = _ldbPath;
        this.credStore = new filestorage_1.FileStorage(this._storePath);
    }
    CategoriesSync.prototype.start = function () {
        var _this = this;
        this.db = new PouchDB(this._ldbPath + '/' + app_meta_1.CATEGORIES_LIST_SYNC_DB_NAME);
        this.credStore.getCredentials(function (credGetError, credentials) {
            console.log('----- Starting cron to get category list at - ' + new Date());
            if (credGetError) {
                console.log('error getting credentials', credGetError);
                return;
            }
            var filter = {
                size: 1000,
            };
            _this._getNomenCategories(filter, credentials, function (err, resp) {
                console.log(err, resp);
                // if everything is ok, then reset counters
                if (resp) {
                }
            });
        });
    };
    CategoriesSync.prototype._getNomenCategories = function (filter, credentials, callback) {
        var _this = this;
        // start nomenclature sync
        var bgSync = new backgroundsync_request_1.BgSyncRequests.CategoriesSyncRequest(JSON.parse(credentials));
        bgSync.getCategoryList(filter, function (syncErr, syncResp) {
            if (syncErr) {
                return callback(syncErr, null);
            }
            if (syncResp && syncResp.groups) {
                _this._saveCategoriesToLocalDb(syncResp.groups)
                    .then(function (r) {
                    callback(null, true);
                })
                    .catch(function (e) {
                    callback(e, null);
                });
            }
            else {
                return callback({ message: 'Some error accured while getting list of categories', details: syncResp, status: 500 }, null);
            }
            if (syncErr === null && syncResp === null) {
                return callback({ message: 'cannot get credentials', status: 500 }, null);
            }
        });
    };
    CategoriesSync.prototype._saveCategoriesToLocalDb = function (categories) {
        var _this = this;
        return Promise.all(categories.map(function (cat) {
            return _this.db.get(cat.uid)
                .then(function (r) {
                cat._id = r._id;
                cat._rev = r._rev;
                return _this.db.put(cat);
            })
                .catch(function (e) {
                cat._id = cat.uid;
                return _this.db.put(cat);
            })
                .catch(function (e) {
                return Promise.reject({ message: 'Error on updating categories', cat: cat, status: 500, details: e });
            })
                .then(function (r) {
                return Promise.resolve({ message: 'Records for categories are successfully updated.', status: 202 });
            });
        }));
    };
    return CategoriesSync;
}());
exports.CategoriesSync = CategoriesSync;
//# sourceMappingURL=categories-sync.js.map