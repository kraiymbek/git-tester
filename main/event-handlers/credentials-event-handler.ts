import { EventHandlerBase } from './event-handler-base';
import { FileStorage } from '../utils/in-memory-store/filestorage';
import { MerchantCredentials } from '../models/i-storage';

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

export class CredentialsEventHandler extends EventHandlerBase {
  constructor(private fileStorage: FileStorage) {
    super();
  }

  initListener() {
    this._authCredentialsIPCListener();
    this._outletIPCHandler();
    this._saveMerchantCredentials();
    this._saveMerchantCashbox();
    this._saveMerchCurrCashboxWorkshift();
    this._updateAuthData();
  }

  private _authCredentialsIPCListener() {
    // saves to userData, client credentials
    this.ipcMain.on('save-token', (event, credentials) => {
      // writing merchant credentials to json in order to access while sync from api
      const credData: MerchantCredentials = <MerchantCredentials>{};
      credData.authCredentials = credentials;

      this.fileStorage.saveCredentials(credData, (err, resp) => {
        if (err) {
          console.log('error saveing credentials', err);
          return;
        }
      });
    });
  }

  private _updateAuthData() {
    this.ipcMain.on('update-token', (event, data) => {
      this.fileStorage.updateCredentialsData(data, 'authCredentials', (err, resp) => {
        if (err) {
          return event.sender.send('update-token-resp', {message: 'Error', status: 500, error: err});
        }

        if (resp) {
          event.sender.send('update-token-resp', {message: 'OK', status: 201});
        }
      });
    });
  }

  private _outletIPCHandler() {
    this.ipcMain.on('save-outlet', (event, outletData) => {
      this.fileStorage.saveOutletData(outletData, (err, resp) => {
        if (err) {
          log.error(['Error on saving current user outlet', err]);
        }
      });
    });
  }

  private _saveMerchantCredentials() {
    this.ipcMain.on('save-merchant-credentials', (event, environmentData) => {
      this.fileStorage.saveCredentials(environmentData, (err, resp) => {
        if (err) {
          log.error(['Error on saving current user credentials', err]);
          return event.sender.send('save-merchant-credentials-resp', {message: 'Error', status: 500, error: err});
        }

        if (resp) {
          event.sender.send('save-merchant-credentials-resp', {message: 'OK', status: 201});
        }
      });
    });
  }

  private _saveMerchantCashbox() {
    this.ipcMain.on('save-merchant-currentCashbox', (event, data) => {
      this.fileStorage.updateCredentialsData(data, 'currentCashbox', (err, resp) => {
        if (err) {
          log.error(['Error on saving current user currentCashbox', err]);
          return event.sender.send('save-merchant-currentCashbox-resp', {message: 'Error', status: 500, error: err});
        }

        if (resp) {
          event.sender.send('save-merchant-currentCashbox-resp', {message: 'OK', status: 201});
        }
      });
    });
  }

  private _saveMerchCurrCashboxWorkshift() {
    this.ipcMain.on('save-merchant-currentworkshift', (event, data) => {
      this.fileStorage.updateCredentialsData(data, 'currentWorkshift', (err, resp) => {
        let evResp: any = { message: 'Uncought error', status: 500, error: 'unhandled error'};
        if (err) {
          log.error(['Error on saving current user currentworkshift', err]);
          evResp = {message: 'Error', status: 500, error: err};
        }

        if (resp) {
          evResp = {message: 'OK', status: 201};
        }

        event.sender.send('save-merchant-currentworkshift-resp', evResp);
      });
    });
  }
}
