import * as fs from 'fs';
import { CURRENT_USER_ID_FILE_NAME } from '../app-meta';
import { MerchantCredentials } from '../models/i-storage';

export class MerchantSwitcher {
  private static _instance: MerchantSwitcher;

  // app data folder location path
  private  _appDataPath: string;

  // current app user is User MerchantId
  private _currentAppUser: string;

  private constructor(private _storePath: string) {
    this._appDataPath = this._storePath;
  }

  public static getInstance(storePath: string) {
    if (!this._instance) {
      this._instance = new MerchantSwitcher(storePath);
    }
    return this._instance;
  }

  public setCurrentAppUser(identifier: string) {
    this._currentAppUser = identifier;
  }

  public getCurrentAppUser(): Promise<string> {
    if (this._currentAppUser) {
      return Promise.resolve(this._currentAppUser);
    }

    return new Promise((res, rej) => {
      fs.readFile(this._appDataPath + '/' + CURRENT_USER_ID_FILE_NAME, (err, data) => {
        if (err) {
          rej(err);
        }

        res(data.toString());
      });
    });
  }

  // namespace - folder named after merchantId
  /*
  *  namespace has additional folders and files:
  *   - database folder;
  *   - credentials.json;
  *   - products meta;
  *   - transactions meta;
  * */
  public createMerchantNamespace(currentUserData: MerchantCredentials, cb) {
    const path: string = this._appDataPath;
    if (!this._currentAppUser) {
      return cb({message: 'Error', Error: 'undefined identifier set', status: 500});
    }

    // add to the currentUser file user identifier
    fs.writeFile(path + '/' + CURRENT_USER_ID_FILE_NAME, this._currentAppUser, err => {
      if (err) {
        return cb(err, null);
      }

      // add namesapce to current user or use if exists
      const currUserNamespacePath = path + '/' + this._currentAppUser;
      fs.access(currUserNamespacePath, fs.constants.F_OK, accErr => {
        if (accErr) {
          /*
          * create namespace
          * */
          fs.mkdir(currUserNamespacePath, { recursive: true }, mkdErr => {
            if (mkdErr) {
              return cb(mkdErr, null);
            }
            fs.mkdir(currUserNamespacePath + '/databases', mkdDerr => {
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
  }
}
