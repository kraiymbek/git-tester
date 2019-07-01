"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sqlite3 = require('sqlite3');
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var SqlConnection = /** @class */ (function () {
    function SqlConnection(dbPath, cb) {
        this.db = new sqlite3.Database(dbPath, function (e) {
            if (e) {
                log.error(['error on db connections', e]);
            }
            if (cb) {
                cb(e);
            }
        });
    }
    SqlConnection.prototype.get = function (sql, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return new Promise(function (resolve, reject) {
            _this.db.get(sql, params, function (err, result) {
                if (err) {
                    log.error('Error running sql: ' + sql);
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    };
    SqlConnection.prototype.all = function (sql, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return new Promise(function (resolve, reject) {
            _this.db.all(sql, params, function (err, rows) {
                if (err) {
                    log.error(['Error running sql: ', sql]);
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    };
    // run sql statement
    SqlConnection.prototype.run = function (sql, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return new Promise(function (resolve, reject) {
            _this.db.run(sql, params, function (err) {
                if (err) {
                    log.error(['Error running sql ', err]);
                    reject(err);
                }
                else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    };
    SqlConnection.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.db.close(function (closeErr) {
                if (closeErr) {
                    log.error(['error on closing db', closeErr]);
                    reject(closeErr);
                }
                resolve(closeErr);
            });
        });
    };
    return SqlConnection;
}());
exports.SqlConnection = SqlConnection;
//# sourceMappingURL=sql-connection.js.map