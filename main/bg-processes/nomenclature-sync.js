"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_meta_1 = require("../app-meta");
var nomen_repository_1 = require("../models/nomenclatures/nomen-repository");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
/*
* singleton class
* */
var NomenclatureSync = /** @class */ (function () {
    function NomenclatureSync(_storePath, _ldbPath, _useNosqlDB) {
        this._storePath = _storePath;
        this._ldbPath = _ldbPath;
        this._useNosqlDB = _useNosqlDB;
        this.isSyncing = false;
        this.totalNumber = 1;
        // number of synced items
        this.currentNumber = 0;
        if (_storePath) {
            this.credStore = new filestorage_1.FileStorage(this._storePath);
        }
    }
    NomenclatureSync.getInstace = function (_storePath, _ldbPath, _useNosqlDB) {
        if (!this._instance) {
            this._instance = new NomenclatureSync(_storePath, _ldbPath, _useNosqlDB);
        }
        return this._instance;
    };
    NomenclatureSync.stop = function () {
        this._instance = null;
    };
    NomenclatureSync.prototype.start = function () {
        var _this = this;
        this.credStore.getCredentials(function (credGetError, credentials) {
            if (credGetError) {
                return log.info('error getting credentials', credGetError);
            }
            log.info('nomen list sync started');
            var filter = {
                size: 1000,
            };
            _this.credStore.getDataFromFile(app_meta_1.LAST_UPD_PRODUCT_DATE_FILE_NAME, function (errRead, date) {
                if (errRead) {
                    filter.up_updated = app_meta_1.INITIAL_NOMEN_SYNC_DATE;
                }
                if (date) {
                    try {
                        date = JSON.parse(date);
                        filter.up_updated = date.lastUpdatedProductDate;
                    }
                    catch (e) {
                        filter.up_updated = app_meta_1.INITIAL_NOMEN_SYNC_DATE;
                        log.error(['Error parsing nomenclature date: details - ' + date, e]);
                    }
                }
                try {
                    credentials = JSON.parse(credentials);
                    if (!_this.isSyncing) {
                        _this.isSyncing = true;
                        _this._getNomenclatures(filter, credentials, function (err, resp) {
                            _this.isSyncing = false;
                            // if everything is ok, then reset counters
                            if (resp) {
                                _this.totalNumber = 1;
                                _this.currentNumber = 0;
                            }
                            if (err) {
                                log.error(['Error updateing nomens db', err]);
                            }
                        });
                    }
                }
                catch (e) {
                    log.info('NOMEN SYNC ERROR: error parsing credentials json', e);
                }
            });
        });
    };
    NomenclatureSync.prototype._getNomenclatures = function (filter, credentials, callback) {
        var _this = this;
        // start nomenclature sync
        var bgSync = new backgroundsync_request_1.BgSyncRequests.NomenclatureSyncRequest(credentials);
        if (this.totalNumber > 0) {
            bgSync.getNomenList(filter, function (syncErr, syncResp) {
                if (syncErr) {
                    return callback(syncErr, null);
                }
                if (syncErr === null && syncResp === null) {
                    return callback({ message: 'not valid credentials, while syncing nomen list', status: 500, isLog: true }, null);
                }
                if (syncResp) {
                    if (syncResp.nomenclature !== null) {
                        if (!syncResp.nomenclature) {
                            return callback(syncResp, null);
                        }
                        else {
                            _this.currentNumber += syncResp.nomenclature.length;
                            _this.totalNumber = syncResp.total_hits - 1;
                            filter.up_updated = syncResp.nomenclature[syncResp.nomenclature.length - 1].updated_on;
                            // console.log('number of synced items out of - ' +  totalNumber, currentNumber);
                            var lastItemDate_1 = {
                                lastUpdatedProductDate: filter.up_updated,
                                lastUpdatedProduct: syncResp.nomenclature[syncResp.nomenclature.length - 1],
                            };
                            // save to local db
                            _this._nomenRepo = new nomen_repository_1.NomenRepository(_this._ldbPath, _this._useNosqlDB);
                            _this._nomenRepo.saveNomenclaturesToLocalDb(syncResp.nomenclature)
                                .then(function (r) {
                                if (r && r.length) {
                                }
                                _this.credStore.saveDataToFile(app_meta_1.LAST_UPD_PRODUCT_DATE_FILE_NAME, lastItemDate_1, function (err, resp) {
                                    if (err) {
                                        return callback(err, null);
                                    }
                                    if (resp) {
                                        _this._getNomenclatures(filter, credentials, callback);
                                    }
                                });
                            }).catch(function (e) {
                                callback(e, null);
                            });
                        }
                    }
                }
            });
        }
        else {
            callback(null, true);
        }
    };
    return NomenclatureSync;
}());
exports.NomenclatureSync = NomenclatureSync;
//# sourceMappingURL=nomenclature-sync.js.map