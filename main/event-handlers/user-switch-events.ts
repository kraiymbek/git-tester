import { EventHandlerBase } from './event-handler-base';
import { FileStorage } from '../utils/in-memory-store/filestorage';
import { MerchantSwitcher } from '../utils/merchant-switcher';
import { initializeEventHandlers } from './index';
import { initMerchantDataSync } from '../bg-processes/bg-process-initializer';
import { USER_DATABASE_FOLDER_NAME } from '../app-meta';

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

export class UserSwitchEvents  extends EventHandlerBase {
  constructor(private _userDataPath: string) {
    super();
  }

  /*
  * saves current app user identifiers and credentials
  * creates namespace
  * starts event handlers and merchant data sync for current user
  * */
  initListener() {
    this._saveCurrentUserCredentials((err, resp) => {
      if (err) {
        return log.error([err]);
      }

      if (resp) {
        const merchantSwithcer = MerchantSwitcher.getInstance(this._userDataPath);

        merchantSwithcer.getCurrentAppUser()
          .then(currentSelectedUserId => {
            const currentUserNamespacePath = this._userDataPath + '/' + currentSelectedUserId;
            const userDatabasesPath = currentUserNamespacePath + '/' + USER_DATABASE_FOLDER_NAME;
            // initialize electron main and client ipc synchronisation
            initializeEventHandlers(this._userDataPath, currentUserNamespacePath, userDatabasesPath);

            // start cron job
            initMerchantDataSync(currentUserNamespacePath, userDatabasesPath);
          })
          .catch(e => {
            return log.error(['error getting current user identifier', err]);
          });
      }
    });

    this._setCurrentUserCredentials((err, resp) => {
      log.error([err, resp]);
    });
  }

  private _setCurrentUserCredentials(cb) {
    this.ipcMain.on('set-currentuser-credentials', (event, currentUserData) => {
      const merchantSwithcer = MerchantSwitcher.getInstance(this._userDataPath);
      merchantSwithcer.getCurrentAppUser()
      .then(currentMerchant => {
        const localFs = new FileStorage(this._userDataPath + '/' + currentMerchant);
        localFs.saveCredentials(currentUserData, (cSerr, cSresp) => {
          // response to client
          event.sender.send('set-currentuser-credentials-resp', cSresp);
          cb(null, true);
        });
      })
      .catch(currMerErr => {
        log.error(['Error: current merchant data not recorded to app user data path', currMerErr]);
        cb(currMerErr, null);
      });
    });
  }
  /*
  * saves current user identifiers to app local data path
  * identifier is merchant Id
  * */
  private _saveCurrentUserCredentials(cb) {
    this.ipcMain.on('save-currentuser-credentials', (event, currentUserData) => {
      if (currentUserData && currentUserData.currentUser) {
        const merchantSwithcer = MerchantSwitcher.getInstance(this._userDataPath);

        merchantSwithcer.setCurrentAppUser(currentUserData.currentUser);
        merchantSwithcer.createMerchantNamespace(currentUserData, (err, resp) => {
          if (err) {
            log.error(['Error: error accured on getting current user identifier', err]);
            return cb(err, null);
          }

          if (resp) {
            merchantSwithcer.getCurrentAppUser()
              .then(currentMerchant => {
                const localFs = new FileStorage(this._userDataPath + '/' + currentMerchant);
                localFs.saveCredentials(currentUserData, (cSerr, cSresp) => {
                  // response to client
                  event.sender.send('save-currentuser-credentials-resp', resp);
                  cb(null, true);
                });
              })
              .catch(currMerErr => {
                log.error(['Error: current merchant data not recorded to app user data path', err]);
                cb(currMerErr, null);
              });
          }
        });

      } else {
        const resp: IcpResponse = {
          message: 'Error',
          status: 500,
          details: 'There is not user identifier for current user',
        };

        // response to client
        event.sender.send('save-currentuser-credentials-resp', resp);
        cb(resp, null);
      }
    });
  }
}

export interface IcpResponse {
  message: string;
  status: number;
  details?: any;
}
