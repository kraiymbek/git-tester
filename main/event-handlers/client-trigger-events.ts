import { app } from 'electron';

import { EventHandlerBase } from './event-handler-base';
import { NomenclatureSync } from '../bg-processes/nomenclature-sync';
import { CategoriesSync } from '../bg-processes/categories-sync';
import { FavouriteListSync } from '../bg-processes/favourite-list-sync';
import { TransactionSync } from '../bg-processes/transaction-sync';
import TransactionOrderSync = TransactionSync.TransactionOrderSync;
import TransactionListSync = TransactionSync.TransactionListSync;
import TransactionTransferSync = TransactionSync.TransactionTransferSync;
import { CURRENT_USER_ID_FILE_NAME } from '../app-meta';
import { initNomenSyncCron } from '../bg-processes/nomenclature-cron';

import * as fs from 'fs';

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

/*
* @appPath - app main directory;
* @_userDataPath - user namespace;
* @_userDBPath - @_userDataPath + 'databases' - directory for database files;
* */

export class ClientTriggerEvents extends EventHandlerBase {
  constructor(private _appPath: string, private _userDataPath: string, private _userDBPath: string) { super(); }

  listenClientTrigger() {
    this._startMerchantDataSync(this._userDataPath, this._userDBPath);
    this._startMerchantCloseListener(this._appPath);
  }

  private _startMerchantDataSync(storePath, ldbPath) {
    this.ipcMain.on('start-merchant-data-sync', (event) => {
      const nomenSync = NomenclatureSync.getInstace(storePath, ldbPath);
      nomenSync.start();

      const categoriesSync = new CategoriesSync(storePath, ldbPath);
      categoriesSync.start();

      const transactionListSync = TransactionListSync.getInstace(storePath, ldbPath);
      transactionListSync.startListSync();

      const transactionOrderSync = new TransactionOrderSync(storePath, ldbPath);
      transactionOrderSync.start();

      const favouriteListSync = new FavouriteListSync(storePath, ldbPath);
      favouriteListSync.start();

      const  transactionTransferSync = new TransactionTransferSync(storePath, ldbPath);
      transactionTransferSync.start();
      event.sender.send('start-merchant-data-sync-resp', { message: 'OK', status: 200});
    });
  }

  /*
  * listen from closing workshift and perform bottom tasks:
  *  - in app folder clean currentuser file to;
  *  - stop sync and cron processes for closed user;
  *  @appPath - main app directory
  * */
  private _startMerchantCloseListener(appPath: string) {
    this.ipcMain.on('on-merchant-workshift-close', (event, data) => {
      const appCurrentUserIdentifierPath = appPath + '/' + CURRENT_USER_ID_FILE_NAME;

      // fix bug on merchant close
      // clear file
      // stop sync process and cron
      fs.writeFile(appCurrentUserIdentifierPath, '', saveErr => {
        let resp: any = { status: 201 };

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
          initNomenSyncCron(this._userDataPath, this._userDBPath).stop();
          NomenclatureSync.stop();
          TransactionListSync.stop();
          app.relaunch();
          app.quit();
        }
      });
    });
  }
}
