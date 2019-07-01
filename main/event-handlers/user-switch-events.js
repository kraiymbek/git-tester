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
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var merchant_switcher_1 = require("../utils/merchant-switcher");
var index_1 = require("./index");
var bg_process_initializer_1 = require("../bg-processes/bg-process-initializer");
var app_meta_1 = require("../app-meta");
var log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';
var UserSwitchEvents = /** @class */ (function (_super) {
    __extends(UserSwitchEvents, _super);
    function UserSwitchEvents(_userDataPath) {
        var _this = _super.call(this) || this;
        _this._userDataPath = _userDataPath;
        return _this;
    }
    /*
    * saves current app user identifiers and credentials
    * creates namespace
    * starts event handlers and merchant data sync for current user
    * */
    UserSwitchEvents.prototype.initListener = function () {
        var _this = this;
        this._saveCurrentUserCredentials(function (err, resp) {
            if (err) {
                return log.error([err]);
            }
            if (resp) {
                var merchantSwithcer = merchant_switcher_1.MerchantSwitcher.getInstance(_this._userDataPath);
                merchantSwithcer.getCurrentAppUser()
                    .then(function (currentSelectedUserId) {
                    var currentUserNamespacePath = _this._userDataPath + '/' + currentSelectedUserId;
                    var userDatabasesPath = currentUserNamespacePath + '/' + app_meta_1.USER_DATABASE_FOLDER_NAME;
                    // initialize electron main and client ipc synchronisation
                    index_1.initializeEventHandlers(_this._userDataPath, currentUserNamespacePath, userDatabasesPath);
                    // start cron job
                    bg_process_initializer_1.initMerchantDataSync(currentUserNamespacePath, userDatabasesPath);
                })
                    .catch(function (e) {
                    return log.error(['error getting current user identifier', err]);
                });
            }
        });
        this._setCurrentUserCredentials(function (err, resp) {
            log.error([err, resp]);
        });
    };
    UserSwitchEvents.prototype._setCurrentUserCredentials = function (cb) {
        var _this = this;
        this.ipcMain.on('set-currentuser-credentials', function (event, currentUserData) {
            var merchantSwithcer = merchant_switcher_1.MerchantSwitcher.getInstance(_this._userDataPath);
            merchantSwithcer.getCurrentAppUser()
                .then(function (currentMerchant) {
                var localFs = new filestorage_1.FileStorage(_this._userDataPath + '/' + currentMerchant);
                localFs.saveCredentials(currentUserData, function (cSerr, cSresp) {
                    // response to client
                    event.sender.send('set-currentuser-credentials-resp', cSresp);
                    cb(null, true);
                });
            })
                .catch(function (currMerErr) {
                log.error(['Error: current merchant data not recorded to app user data path', currMerErr]);
                cb(currMerErr, null);
            });
        });
    };
    /*
    * saves current user identifiers to app local data path
    * identifier is merchant Id
    * */
    UserSwitchEvents.prototype._saveCurrentUserCredentials = function (cb) {
        var _this = this;
        this.ipcMain.on('save-currentuser-credentials', function (event, currentUserData) {
            if (currentUserData && currentUserData.currentUser) {
                var merchantSwithcer_1 = merchant_switcher_1.MerchantSwitcher.getInstance(_this._userDataPath);
                merchantSwithcer_1.setCurrentAppUser(currentUserData.currentUser);
                merchantSwithcer_1.createMerchantNamespace(currentUserData, function (err, resp) {
                    if (err) {
                        log.error(['Error: error accured on getting current user identifier', err]);
                        return cb(err, null);
                    }
                    if (resp) {
                        merchantSwithcer_1.getCurrentAppUser()
                            .then(function (currentMerchant) {
                            var localFs = new filestorage_1.FileStorage(_this._userDataPath + '/' + currentMerchant);
                            localFs.saveCredentials(currentUserData, function (cSerr, cSresp) {
                                // response to client
                                event.sender.send('save-currentuser-credentials-resp', resp);
                                cb(null, true);
                            });
                        })
                            .catch(function (currMerErr) {
                            log.error(['Error: current merchant data not recorded to app user data path', err]);
                            cb(currMerErr, null);
                        });
                    }
                });
            }
            else {
                var resp = {
                    message: 'Error',
                    status: 500,
                    details: 'There is not user identifier for current user',
                };
                // response to client
                event.sender.send('save-currentuser-credentials-resp', resp);
                cb(resp, null);
            }
        });
    };
    return UserSwitchEvents;
}(event_handler_base_1.EventHandlerBase));
exports.UserSwitchEvents = UserSwitchEvents;
//# sourceMappingURL=user-switch-events.js.map