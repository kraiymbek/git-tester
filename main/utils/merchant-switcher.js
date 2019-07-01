"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var app_meta_1 = require("../app-meta");
var MerchantSwitcher = /** @class */ (function () {
    function MerchantSwitcher(_storePath) {
        this._storePath = _storePath;
        this._appDataPath = this._storePath;
    }
    MerchantSwitcher.getInstance = function (storePath) {
        if (!this._instance) {
            this._instance = new MerchantSwitcher(storePath);
        }
        return this._instance;
    };
    MerchantSwitcher.prototype.setCurrentAppUser = function (identifier) {
        this._currentAppUser = identifier;
    };
    MerchantSwitcher.prototype.getCurrentAppUser = function () {
        var _this = this;
        if (this._currentAppUser) {
            return Promise.resolve(this._currentAppUser);
        }
        return new Promise(function (res, rej) {
            fs.readFile(_this._appDataPath + '/' + app_meta_1.CURRENT_USER_ID_FILE_NAME, function (err, data) {
                if (err) {
                    rej(err);
                }
                res(data.toString());
            });
        });
    };
    // namespace - folder named after merchantId
    /*
    *  namespace has additional folders and files:
    *   - database folder;
    *   - credentials.json;
    *   - products meta;
    *   - transactions meta;
    * */
    MerchantSwitcher.prototype.createMerchantNamespace = function (currentUserData, cb) {
        var _this = this;
        var path = this._appDataPath;
        if (!this._currentAppUser) {
            return cb({ message: 'Error', Error: 'undefined identifier set', status: 500 });
        }
        // add to the currentUser file user identifier
        fs.writeFile(path + '/' + app_meta_1.CURRENT_USER_ID_FILE_NAME, this._currentAppUser, function (err) {
            if (err) {
                return cb(err, null);
            }
            // add namesapce to current user or use if exists
            var currUserNamespacePath = path + '/' + _this._currentAppUser;
            fs.access(currUserNamespacePath, fs.constants.F_OK, function (accErr) {
                if (accErr) {
                    /*
                    * create namespace
                    * */
                    fs.mkdir(currUserNamespacePath, { recursive: true }, function (mkdErr) {
                        if (mkdErr) {
                            return cb(mkdErr, null);
                        }
                        fs.mkdir(currUserNamespacePath + '/databases', function (mkdDerr) {
                            if (mkdDerr) {
                                return cb(mkdDerr, null);
                            }
                            return cb(null, true);
                        });
                    });
                    return;
                }
                cb(null, true);
            });
        });
    };
    return MerchantSwitcher;
}());
exports.MerchantSwitcher = MerchantSwitcher;
//# sourceMappingURL=merchant-switcher.js.map