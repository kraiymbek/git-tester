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
var event_handler_base_1 = require("./event-handler-base");
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var CredentialsEventHandler = /** @class */ (function (_super) {
    __extends(CredentialsEventHandler, _super);
    function CredentialsEventHandler(fileStorage) {
        var _this = _super.call(this) || this;
        _this.fileStorage = fileStorage;
        return _this;
    }
    CredentialsEventHandler.prototype.initListener = function () {
        this._authCredentialsIPCListener();
        this._outletIPCHandler();
        this._saveMerchantCredentials();
        this._saveMerchantCashbox();
        this._saveMerchCurrCashboxWorkshift();
        this._updateAuthData();
    };
    CredentialsEventHandler.prototype._authCredentialsIPCListener = function () {
        var _this = this;
        // saves to userData, client credentials
        this.ipcMain.on('save-token', function (event, credentials) {
            // writing merchant credentials to json in order to access while sync from api
            var credData = {};
            credData.authCredentials = credentials;
            _this.fileStorage.saveCredentials(credData, function (err, resp) {
                if (err) {
                    console.log('error saveing credentials', err);
                    return;
                }
            });
        });
    };
    CredentialsEventHandler.prototype._updateAuthData = function () {
        var _this = this;
        this.ipcMain.on('update-token', function (event, data) {
            _this.fileStorage.updateCredentialsData(data, 'authCredentials', function (err, resp) {
                if (err) {
                    return event.sender.send('update-token-resp', { message: 'Error', status: 500, error: err });
                }
                if (resp) {
                    event.sender.send('update-token-resp', { message: 'OK', status: 201 });
                }
            });
        });
    };
    CredentialsEventHandler.prototype._outletIPCHandler = function () {
        var _this = this;
        this.ipcMain.on('save-outlet', function (event, outletData) {
            _this.fileStorage.saveOutletData(outletData, function (err, resp) {
                if (err) {
                    log.error(['Error on saving current user outlet', err]);
                }
            });
        });
    };
    CredentialsEventHandler.prototype._saveMerchantCredentials = function () {
        var _this = this;
        this.ipcMain.on('save-merchant-credentials', function (event, environmentData) {
            _this.fileStorage.saveCredentials(environmentData, function (err, resp) {
                if (err) {
                    log.error(['Error on saving current user credentials', err]);
                    return event.sender.send('save-merchant-credentials-resp', { message: 'Error', status: 500, error: err });
                }
                if (resp) {
                    event.sender.send('save-merchant-credentials-resp', { message: 'OK', status: 201 });
                }
            });
        });
    };
    CredentialsEventHandler.prototype._saveMerchantCashbox = function () {
        var _this = this;
        this.ipcMain.on('save-merchant-currentCashbox', function (event, data) {
            _this.fileStorage.updateCredentialsData(data, 'currentCashbox', function (err, resp) {
                if (err) {
                    log.error(['Error on saving current user currentCashbox', err]);
                    return event.sender.send('save-merchant-currentCashbox-resp', { message: 'Error', status: 500, error: err });
                }
                if (resp) {
                    event.sender.send('save-merchant-currentCashbox-resp', { message: 'OK', status: 201 });
                }
            });
        });
    };
    CredentialsEventHandler.prototype._saveMerchCurrCashboxWorkshift = function () {
        var _this = this;
        this.ipcMain.on('save-merchant-currentworkshift', function (event, data) {
            _this.fileStorage.updateCredentialsData(data, 'currentWorkshift', function (err, resp) {
                var evResp = { message: 'Uncought error', status: 500, error: 'unhandled error' };
                if (err) {
                    log.error(['Error on saving current user currentworkshift', err]);
                    evResp = { message: 'Error', status: 500, error: err };
                }
                if (resp) {
                    evResp = { message: 'OK', status: 201 };
                }
                event.sender.send('save-merchant-currentworkshift-resp', evResp);
            });
        });
    };
    return CredentialsEventHandler;
}(event_handler_base_1.EventHandlerBase));
exports.CredentialsEventHandler = CredentialsEventHandler;
//# sourceMappingURL=credentials-event-handler.js.map