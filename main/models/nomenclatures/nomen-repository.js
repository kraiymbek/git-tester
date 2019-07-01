"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_meta_1 = require("../../app-meta");
var sql_connection_1 = require("../../utils/sql-connection");
var PouchDB = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));
var NomenSearchTypes;
(function (NomenSearchTypes) {
    // ew - everywhere
    NomenSearchTypes["name"] = "name";
    NomenSearchTypes["articul"] = "articul";
    NomenSearchTypes["bar_code"] = "bar_code";
    NomenSearchTypes["ew"] = "ew";
})(NomenSearchTypes = exports.NomenSearchTypes || (exports.NomenSearchTypes = {}));
var NomenSortTypes;
(function (NomenSortTypes) {
    NomenSortTypes["updated_on"] = "updated_on";
    NomenSortTypes["name"] = "name";
})(NomenSortTypes = exports.NomenSortTypes || (exports.NomenSortTypes = {}));
var NomenRepository = /** @class */ (function () {
    function NomenRepository(_ldbPath, useNosql) {
        this._ldbPath = _ldbPath;
        this.nomenListTable = app_meta_1.NOMEN_LIST_TABLE_NAME;
        if (useNosql) {
            this.db = new PouchDB(this._ldbPath);
            return;
        }
        if (!this.sqlDb) {
            this.sqlDb = new sql_connection_1.SqlConnection(this._ldbPath + '/' + app_meta_1.APP_SQL_DB_NAME + '.db');
        }
    }
    NomenRepository.prototype.closeDb = function () {
        return this.sqlDb.close();
    };
    NomenRepository.prototype.search = function (query) {
        var queryValue = query.value;
        var stock = query.stock;
        var sql = 'select * from nomenlist where ((name_to_search) '
            + ' like (' + '"%' + queryValue.toLocaleLowerCase() + '%"' + ')'
            + 'or (bar_code)' +
            ' like (' + '"%' + queryValue + '%"' + '))';
        if (stock) {
            sql += ' and stock_id = ' + '"' + stock + '"';
        }
        return this.sqlDb.all(sql);
    };
    NomenRepository.prototype.filter = function (nomenFilter) {
        var _this = this;
        var sql;
        var query_name_article_barcode = nomenFilter.query_name_article_barcode;
        var stock_id = nomenFilter.stock;
        sql = "select * from " + this.nomenListTable + " where stock_id = \"" + stock_id + "\"";
        // filtering by category
        if (nomenFilter.group_id) {
            sql += ' and group_id =' + '"' + nomenFilter.group_id + '"';
        }
        if (nomenFilter.sort) {
            sql += " ORDER BY " + nomenFilter.sort + " DESC";
        }
        sql += " limit " + nomenFilter.size + " offset " + nomenFilter.from;
        if (query_name_article_barcode) {
            query_name_article_barcode = query_name_article_barcode.replace(/['"\n]g/, '');
            sql = 'select * from ' + this.nomenListTable + ' where (name = ' + '"' +
                query_name_article_barcode + '"' + ' OR bar_code = '
                + '"' + query_name_article_barcode + '"' + ') AND stock_id ='
                + '"' + stock_id + '"';
        }
        return this.sqlDb.all(sql)
            .then(function (r) {
            var resp = { nomenclature: r, total_hits: 0, status: 200 };
            if (!r.length) {
                return Promise.reject({ message: 'Error', status: 404, Error: 'Not found' });
            }
            return _this._getTotalNomenByFilter(nomenFilter)
                .then(function (count) {
                resp.total_hits = count['count(*)'];
                return Promise.resolve(resp);
            });
        });
    };
    NomenRepository.prototype.saveNomenclaturesToLocalDb = function (nomenclatures, isNosql) {
        if (isNosql) {
            return this._saveToNosql(nomenclatures);
        }
        return this._saveToSql(nomenclatures);
    };
    NomenRepository.prototype._saveToSql = function (nomenclatures) {
        var _this = this;
        if (this.error) {
            return Promise.reject(this.error);
        }
        return this._createTable()
            .then(function (r) {
            return _this._updateNomenclature(nomenclatures);
        }).then(function (r) {
            // inserting to db res
            // closing db to avoid memory leak
            return _this.closeDb()
                .then(function (closeR) { return Promise.resolve(r); })
                .catch(function (e) { return Promise.reject({ message: 'Error closing db', Error: e, status: 500 }); });
        })
            .catch(function (e) {
            var eResp = { message: 'Error', Error: e, status: 500 };
            if (e.status) {
                eResp = e;
            }
            return Promise.reject(eResp);
        });
    };
    NomenRepository.prototype.updatePrice = function (uid, price) {
        var sqlStmt = "UPDATE " + this.nomenListTable + " SET price = " + price + " WHERE uid = \"" + uid + "\"";
        return this.sqlDb.run(sqlStmt)
            .then(function (r) {
            return Promise.resolve({ message: 'Ok', status: 201, details: r });
        })
            .catch(function (e) {
            return Promise.reject({ message: 'Error', Error: e, status: 500 });
        });
    };
    NomenRepository.prototype._updateNomenclature = function (nomenclatures) {
        // check if exist in table;
        // if not exists then insert new
        // if exist update row
        var sqlInserOrUpdate = "INSERT OR REPLACE INTO " + this.nomenListTable + "\n       (id, uid, name_to_search, name, merchant_id,  amount, price, stock_id, bar_code, group_id, unit, created_on, updated_on) VALUES";
        var stmtValue = '';
        nomenclatures.forEach(function (nomen, index) {
            var stockId = nomen.stock_id && nomen.stock_id.length ? nomen.stock_id[0] : '';
            var barcode = '';
            if (nomen.bar_code) {
                barcode = nomen.bar_code.length ? nomen.bar_code[0] : '';
            }
            var groupId = nomen.group_id && nomen.group_id.length ? nomen.group_id[0] : '';
            var name = nomen.name.replace(/["']/g, '');
            var name_to_search = name.toLocaleLowerCase();
            var unit = nomen.unit ? '"' + nomen.unit + '"' : '""';
            var merchantId = nomen.merchant_id;
            stmtValue += '(' + '"' + nomen.uid + '"' + ',' + '"' + nomen.uid + '"' + ','
                + '"' + name_to_search + '",'
                + '"' + name + '"' + ','
                + '"' + merchantId + '"' + ','
                + nomen.amount + ','
                + nomen.price + ','
                + '"' + stockId + '"' + ','
                + '"' + barcode + '"' + ','
                + '"' + groupId + '"' + ','
                + unit + ','
                + '"' + nomen.created_on + '"' + ','
                + '"' + nomen.updated_on + '")';
            if (!(nomenclatures.length - 1 === index)) {
                stmtValue += ',';
            }
        });
        return this.sqlDb.run(sqlInserOrUpdate + stmtValue)
            .then(function (r) {
            return Promise.resolve({ message: 'Ok', status: 201, details: r });
        })
            .catch(function (e) { return Promise.reject({ message: 'Error', Error: e, status: 500 }); });
    };
    NomenRepository.prototype._createTable = function () {
        var sql = "CREATE TABLE IF NOT EXISTS " + this.nomenListTable + " (\n        id TEXT UNIQUE,\n        uid TEXT PRIMARY KEY,\n        name_to_search TEXT collate nocase,\n        name TEXT collate nocase,\n        merchant_id TEXT,\n        amount INTEGER,\n        price INTEGER,\n        stock_id TEXT,\n        bar_code TEXT collate nocase,\n        group_id TEXT,\n        unit TEXT NOT NULL,\n        created_on TEXT,\n        updated_on TEXT)";
        return this.sqlDb.run(sql);
    };
    NomenRepository.prototype._saveToNosql = function (nomenclatures) {
        var _this = this;
        return Promise.all(nomenclatures.map(function (nomen) {
            return _this.db.get(nomen.uid)
                .then(function (r) {
                nomen._id = r._id;
                nomen._rev = r._rev;
                nomen.barcode = r.bar_code && r.bar_code.length ? r.bar_code[0] : '';
                nomen.stockId = r.stock_id && r.stock_id.length ? r.stock_id[0] : '';
                nomen.groupId = r.group_id && r.group_id.length ? r.group_id[0] : '';
                return _this.db.put(nomen);
            })
                .catch(function () {
                nomen._id = nomen.uid;
                nomen.barcode = nomen.bar_code && nomen.bar_code.length ? nomen.bar_code[0] : '';
                nomen.stockId = nomen.stock_id && nomen.stock_id.length ? nomen.stock_id[0] : '';
                nomen.groupId = nomen.group_id && nomen.group_id.length ? nomen.group_id[0] : '';
                return _this.db.put(nomen);
            })
                .catch(function (e) {
                return Promise.reject({ message: 'Error on updating nomenclature', nomen: nomen, status: 500, details: e });
            })
                .then(function (r) {
                return Promise.resolve({ message: 'Records for nomenclatures are successfully updated.', status: 202 });
            });
        }));
    };
    NomenRepository.prototype._getTotalNomenByFilter = function (filter) {
        var sql = "select count(*) from " + this.nomenListTable + " where stock_id = \"" + filter.stock + "\" ";
        if (filter.group_id) {
            sql += ' and group_id =' + '"' + filter.group_id + '"';
        }
        return this.sqlDb.get(sql);
    };
    return NomenRepository;
}());
exports.NomenRepository = NomenRepository;
//# sourceMappingURL=nomen-repository.js.map