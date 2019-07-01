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
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var event_handler_base_1 = require("./event-handler-base");
var app_meta_1 = require("../app-meta");
var nomen_repository_1 = require("../models/nomenclatures/nomen-repository");
var NomenEventHandler = /** @class */ (function (_super) {
    __extends(NomenEventHandler, _super);
    function NomenEventHandler(_dataBasePath) {
        var _this = _super.call(this) || this;
        _this._dataBasePath = _dataBasePath;
        return _this;
    }
    NomenEventHandler.prototype.clientIPCListener = function () {
        var _this = this;
        // fetches nomen list according to filter and sends to renderer process
        this.ipcMain.on('get-all-nomens', function (event, filter) {
            var nomenFilter = filter;
            var selector = {};
            selector.stockId = nomenFilter.stock ? nomenFilter.stock : {};
            if (nomenFilter.query_name_article_barcode) {
                selector.barcode = nomenFilter.query_name_article_barcode;
            }
            if (nomenFilter.group_id) {
                selector.groupId = nomenFilter.group_id;
            }
            var query = {};
            query.selector = selector;
            query.limit = nomenFilter.size;
            query.skip = nomenFilter.from;
            var nomenRepo = new nomen_repository_1.NomenRepository(_this._dataBasePath);
            nomenRepo.filter(nomenFilter)
                .then(function (r) {
                event.sender.send('get-all-nomens-resp', r);
            })
                .catch(function (e) {
                log.error(['error getting nomen by filter', e]);
                var resp = e;
                if (!e.status) {
                    resp.message = e;
                    resp.status = 500;
                }
                event.sender.send('get-all-nomens-resp', resp);
            });
        });
        // fetches group list according to filter and sends to renderer process
        this.ipcMain.on('get-all-groups', function (evt, filter) {
            _this.db = new PouchDB(_this._dataBasePath + '/' + app_meta_1.CATEGORIES_LIST_SYNC_DB_NAME);
            _this.db.find({
                selector: {
                    merchant_id: filter.merchant_id,
                },
                limit: filter.size,
                skip: filter.from,
            }).then(function (r) {
                var resp = { message: 'ok', status: 404, details: r };
                if (r.docs && r.docs.length) {
                    resp = {
                        groups: r.docs,
                        status: 200,
                    };
                    return _this.db.info()
                        .then(function (i) {
                        resp.total_hits = i.doc_count;
                        resp.update_seq = i.update_seq;
                        return Promise.resolve(resp);
                    })
                        .catch(function (iE) {
                        return Promise.reject(iE);
                    });
                }
                return Promise.reject(resp);
            })
                .then(function (r) {
                evt.sender.send('get-all-groups-resp', r);
            })
                .catch(function (e) {
                var resp = e;
                if (!e.status) {
                    resp.message = e;
                    resp.status = 500;
                }
                evt.sender.send('get-all-groups-resp', resp);
            });
        });
        // favourite list
        this.ipcMain.on('favourite-list-get', function (evt) {
            _this.db = new PouchDB(_this._dataBasePath + '/' + app_meta_1.FAVOURITE_LIST_SYNC_DB_NAME);
            var mgetDb = new PouchDB(_this._dataBasePath + '/' + app_meta_1.NOMEN_LIST_SYNC_DB_NAME);
            _this.db.get('favorite-products')
                .then(function (rF) {
                return mgetDb.allDocs({
                    include_docs: true,
                    keys: rF['products'],
                }).then(function (r) {
                    var nomenList = r.rows.filter(function (nomen) { return nomen.id !== undefined; });
                    nomenList = nomenList.map(function (n) { return n.doc; });
                    return Promise.resolve(nomenList);
                }).catch(function (e) {
                    return Promise.resolve({ message: 'Error', details: e, status: 500 });
                });
            })
                .then(function (r) {
                evt.sender.send('favourite-list-get-resp', r);
            })
                .catch(function (e) {
                evt.sender.send('favourite-list-get-resp', { message: 'Error', details: e, status: 500 });
            });
        });
        // mget - getting list of nomenclatures by ids
        this.ipcMain.on('nomen-list-mget', function (evt, data) {
            _this.db = new PouchDB(_this._dataBasePath + '/' + app_meta_1.NOMEN_LIST_SYNC_DB_NAME);
            _this.db.allDocs({
                include_docs: true,
                keys: data.uids,
            }).then(function (r) {
                var nomenList = r.rows.filter(function (nomen) { return nomen.id !== undefined; });
                nomenList = nomenList.map(function (n) { return n.doc; });
                evt.sender.send('nomen-list-mget-resp', { nomenclatures: nomenList, status: 200 });
            })
                .catch(function (e) {
                evt.sender.send('nomen-list-mget-resp', { message: 'Error', details: e, status: 500 });
            });
        });
        this.ipcMain.on('search-nomen', function (evt, query) {
            var nomenRepo = new nomen_repository_1.NomenRepository(_this._dataBasePath);
            // leave only letters and digits
            // query.value = query.value.replace(/[^a-zA-Z0-9А-Яа-я ]+/g, '');
            nomenRepo.search(query)
                .then(function (r) {
                var resp = {
                    status: 200,
                    nomenclature: r,
                    total_hits: r.length,
                };
                evt.sender.send('search-nomen-resp', resp);
            })
                .catch(function (e) {
                log.error(['Error on searching', e]);
            });
        });
        this.ipcMain.on('get-total-search', function (evt, query) {
            var regExVal = query.query_name_article_barcode.replace(/[^a-zA-Z0-9А-Яа-я]+/g, '');
            _this.db.find({
                selector: {
                    $or: [{ barcode: query.query_name_article_barcode }, { name: { $regex: RegExp(regExVal, 'i') } }],
                    stockId: query.stock,
                },
                fields: ['_id'],
            }).then(function (all) {
                evt.sender.send('get-total-search-resp', { total_hits: all.docs.length });
            }).catch(function (e) {
                console.log('error getting length', e);
            });
        });
        this.ipcMain.on('update-nomen-price', function (evt, nomen) {
            var nomenRepo = new nomen_repository_1.NomenRepository(_this._dataBasePath);
            nomenRepo.updatePrice(nomen.uid, nomen.price)
                .then(function (r) {
                evt.sender.send('update-nomen-price-resp', r);
            })
                .catch(function (e) {
                evt.sender.send('update-nomen-price-resp', null);
            });
        });
    };
    return NomenEventHandler;
}(event_handler_base_1.EventHandlerBase));
exports.NomenEventHandler = NomenEventHandler;
//# sourceMappingURL=nomen-event-handler.js.map