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
var electron_1 = require("electron");
var event_handler_base_1 = require("./event-handler-base");
var nomenclature_sync_1 = require("../bg-processes/nomenclature-sync");
var categories_sync_1 = require("../bg-processes/categories-sync");
var favourite_list_sync_1 = require("../bg-processes/favourite-list-sync");
var transaction_sync_1 = require("../bg-processes/transaction-sync");
var TransactionOrderSync = transaction_sync_1.TransactionSync.TransactionOrderSync;
var TransactionListSync = transaction_sync_1.TransactionSync.TransactionListSync;
var TransactionTransferSync = transaction_sync_1.TransactionSync.TransactionTransferSync;
var app_meta_1 = require("../app-meta");
var nomenclature_cron_1 = require("../bg-processes/nomenclature-cron");
var fs = require("fs");
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
/*
* @appPath - app main directory;
* @_userDataPath - user namespace;
* @_userDBPath - @_userDataPath + 'databases' - directory for database files;
* */
var ClientTriggerEvents = /** @class */ (function (_super) {
    __extends(ClientTriggerEvents, _super);
    function ClientTriggerEvents(_appPath, _userDataPath, _userDBPath) {
        var _this = _super.call(this) || this;
        _this._appPath = _appPath;
        _this._userDataPath = _userDataPath;
        _this._userDBPath = _userDBPath;
        return _this;
    }
    ClientTriggerEvents.prototype.listenClientTrigger = function () {
        this._startMerchantDataSync(this._userDataPath, this._userDBPath);
        this._startMerchantCloseListener(this._appPath);
    };
    ClientTriggerEvents.prototype._startMerchantDataSync = function (storePath, ldbPath) {
        this.ipcMain.on('start-merchant-data-sync', function (event) {
            var nomenSync = nomenclature_sync_1.NomenclatureSync.getInstace(storePath, ldbPath);
            nomenSync.start();
            var categoriesSync = new categories_sync_1.CategoriesSync(storePath, ldbPath);
            categoriesSync.start();
            var transactionListSync = TransactionListSync.getInstace(storePath, ldbPath);
            transactionListSync.startListSync();
            var transactionOrderSync = new TransactionOrderSync(storePath, ldbPath);
            transactionOrderSync.start();
            var favouriteListSync = new favourite_list_sync_1.FavouriteListSync(storePath, ldbPath);
            favouriteListSync.start();
            var transactionTransferSync = new TransactionTransferSync(storePath, ldbPath);
            transactionTransferSync.start();
            event.sender.send('start-merchant-data-sync-resp', { message: 'OK', status: 200 });
        });
    };
    /*
    * listen from closing workshift and perform bottom tasks:
    *  - in app folder clean currentuser file to;
    *  - stop sync and cron processes for closed user;
    *  @appPath - main app directory
    * */
    ClientTriggerEvents.prototype._startMerchantCloseListener = function (appPath) {
        var _this = this;
        this.ipcMain.on('on-merchant-workshift-close', function (event, data) {
            var appCurrentUserIdentifierPath = appPath + '/' + app_meta_1.CURRENT_USER_ID_FILE_NAME;
            // fix bug on merchant close
            // clear file
            // stop sync process and cron
            fs.writeFile(appCurrentUserIdentifierPath, '', function (saveErr) {
                var resp = { status: 201 };
                if (saveErr) {
                    log.error(['Error clearing current user', saveErr]);
                    resp = {
                        err: saveErr,
                        status: 500,
                    };
                    event.sender.send('on-merchant-workshift-close-resp', resp);
                }
                if (resp.status === 201) {
                    // stop cron jobs
                    nomenclature_cron_1.initNomenSyncCron(_this._userDataPath, _this._userDBPath).stop();
                    nomenclature_sync_1.NomenclatureSync.stop();
                    TransactionListSync.stop();
                    electron_1.app.relaunch();
                    electron_1.app.quit();
                }
            });
        });
    };
    return ClientTriggerEvents;
}(event_handler_base_1.EventHandlerBase));
exports.ClientTriggerEvents = ClientTriggerEvents;
//# sourceMappingURL=client-trigger-events.js.map