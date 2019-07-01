"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var app_meta_1 = require("../../app-meta");
var FileStorage = /** @class */ (function () {
    function FileStorage(userDataPath) {
        this.userDataPath = userDataPath;
        this._userDataPath = userDataPath;
        this.fs = fs;
    }
    FileStorage.prototype.getCredentials = function (callback) {
        this.fs.readFile(this._userDataPath + '/' + app_meta_1.USER_CREDENTIAL_FILE_NAME, 'utf8', function (err, data) {
            if (err && err.errno !== -2) {
                return callback(err, null);
            }
            if (err) {
                return callback(err, null);
            }
            callback(null, data ? data : null);
        });
    };
    FileStorage.prototype.saveCredentials = function (credentials, callback) {
        this.fs.writeFile(this._userDataPath + '/' + app_meta_1.USER_CREDENTIAL_FILE_NAME, JSON.stringify(credentials), function (err) {
            if (err) {
                return callback(err, null);
            }
            callback(null, true);
        });
    };
    FileStorage.prototype.saveOutletData = function (outlet, callback) {
        var _this = this;
        this.getCredentials(function (credGetErr, credentials) {
            if (credGetErr) {
                return callback(credGetErr, null);
            }
            credentials = JSON.parse(credentials);
            credentials['outletData'] = outlet;
            _this.saveCredentials(credentials, function (credSaveErr, saveResp) {
                if (credSaveErr) {
                    return callback(credSaveErr, saveResp);
                }
                callback(credSaveErr, saveResp);
            });
        });
    };
    FileStorage.prototype.updateCredentialsData = function (data, updateKey, callback) {
        var _this = this;
        this.getCredentials(function (err, credentials) {
            var dataToSave;
            if (err) {
                if (err.errno && err.errno === -2) {
                    dataToSave = {};
                    dataToSave[updateKey] = data;
                }
            }
            if (credentials !== null) {
                try {
                    dataToSave = JSON.parse(credentials);
                    dataToSave[updateKey] = data;
                }
                catch (e) {
                    return callback(e, null);
                }
            }
            if (dataToSave) {
                _this.saveCredentials(dataToSave, function (credSaveErr, saveResp) {
                    callback(credSaveErr, saveResp);
                });
            }
            else {
                callback(err ? err : null, null);
            }
        });
    };
    FileStorage.prototype.saveDataToFile = function (fileName, data, callback) {
        this.fs.writeFile(this.userDataPath + '/' + fileName, JSON.stringify(data), function (err) {
            if (err) {
                return callback(err, null);
            }
            callback(null, true);
        });
    };
    FileStorage.prototype.getDataFromFile = function (fileName, callback) {
        this.fs.readFile(this._userDataPath + '/' + fileName, function (err, data) {
            if (err) {
                return callback(err, null);
            }
            callback(null, data);
        });
    };
    FileStorage.prototype.checkAndUpdateFile = function (fileName, data, callback) {
        var _this = this;
        this.getDataFromFile(fileName, function (err, fData) {
            if (err) {
                _this.saveDataToFile(fileName, data, function (sErr, sFData) {
                    callback(sErr, sFData);
                });
                return;
            }
            if (fData) {
                fData = JSON.parse(fData);
                var updatedObj = Object.assign({}, fData, data);
                _this.saveDataToFile(fileName, updatedObj, function (uErr, uResp) {
                    callback(uErr, uResp);
                });
            }
        });
    };
    return FileStorage;
}());
exports.FileStorage = FileStorage;
//# sourceMappingURL=filestorage.js.map