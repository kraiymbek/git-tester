import * as fs from 'fs';
import { MerchantCredentials } from '../../models/i-storage';
import { USER_CREDENTIAL_FILE_NAME } from '../../app-meta';

export class FileStorage {
  private _userDataPath: string;
  fs: typeof fs;

  constructor(private userDataPath: string) {
    this._userDataPath = userDataPath;
    this.fs = fs;
  }

  getCredentials(callback) {
    this.fs.readFile(this._userDataPath + '/' + USER_CREDENTIAL_FILE_NAME, 'utf8', (err, data) => {
      if (err && err.errno !== -2) {
        return callback(err, null);
      }

      if (err) {
        return callback(err, null);
      }
      callback(null, data ? data : null);
    });
  }

  saveCredentials(credentials: MerchantCredentials, callback) {
    this.fs.writeFile(this._userDataPath + '/' + USER_CREDENTIAL_FILE_NAME, JSON.stringify(credentials), err => {
      if (err) {
        return callback(err, null);
      }

      callback(null, true);
    });
  }

  saveOutletData(outlet, callback) {
    this.getCredentials((credGetErr, credentials) => {
      if (credGetErr) {
        return callback(credGetErr, null);
      }
      credentials = JSON.parse(credentials);
      credentials['outletData'] = outlet;
      this.saveCredentials(credentials, (credSaveErr, saveResp) => {
        if (credSaveErr) {
          return callback(credSaveErr, saveResp);
        }
        callback(credSaveErr, saveResp);
      });
    });
  }

  updateCredentialsData(data: any, updateKey: string, callback) {
    this.getCredentials((err, credentials) => {
      let dataToSave;
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
        } catch (e) {
          return callback(e, null);
        }
      }

      if (dataToSave) {
        this.saveCredentials(dataToSave, (credSaveErr, saveResp) => {
          callback(credSaveErr, saveResp);
        });
      } else {
        callback(err ? err : null, null);
      }
    });
  }

  saveDataToFile(fileName: string, data: any, callback) {
    this.fs.writeFile(this.userDataPath + '/' + fileName, JSON.stringify(data), err => {
      if (err) { return  callback(err, null); }
      callback(null, true);
    });
  }

  getDataFromFile(fileName:  string, callback) {
    this.fs.readFile(this._userDataPath + '/' + fileName, (err, data) => {
      if (err) { return callback(err, null); }
      callback(null, data);
    });
  }

  checkAndUpdateFile(fileName: string, data: any, callback) {
    this.getDataFromFile(fileName, (err, fData) => {
      if (err) {
        this.saveDataToFile(fileName, data, (sErr, sFData) => {
          callback(sErr, sFData);
        });
        return;
      }

      if (fData) {
        fData = JSON.parse(fData);
        const updatedObj = Object.assign({}, fData, data);

        this.saveDataToFile(fileName, updatedObj, (uErr, uResp) => {
          callback(uErr, uResp);
        });
      }
    });
  }
}
