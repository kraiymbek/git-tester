import { CbGroup } from '../models/nomenclatures/categories-model';

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

import { FileStorage } from '../utils/in-memory-store/filestorage';
import { CATEGORIES_LIST_SYNC_DB_NAME } from '../app-meta';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';

export class CategoriesSync {
  db: typeof PouchDB;
  credStore: FileStorage;
  // number of synced items

  constructor(private _storePath, private _ldbPath) {
    this.credStore = new FileStorage(this._storePath);
  }

  start() {
    this.db = new PouchDB(this._ldbPath + '/' + CATEGORIES_LIST_SYNC_DB_NAME);
    this.credStore.getCredentials((credGetError, credentials) => {
      console.log('----- Starting cron to get category list at - ' + new Date());
      if (credGetError) {
        console.log('error getting credentials', credGetError);
        return;
      }

      const filter = {
        size: 1000,
      };

      this._getNomenCategories(filter, credentials, (err, resp) => {
        console.log(err, resp);

        // if everything is ok, then reset counters
        if (resp) {
        }
      });
    });
  }

  private _getNomenCategories(filter, credentials, callback) {
    // start nomenclature sync
    const bgSync = new BgSyncRequests.CategoriesSyncRequest(JSON.parse(credentials));

    bgSync.getCategoryList( filter, (syncErr, syncResp) => {
      if (syncErr) {
        return callback(syncErr, null);
      }

      if (syncResp && syncResp.groups) {
        this._saveCategoriesToLocalDb(syncResp.groups)
          .then(r => {
            callback(null, true);
          })
          .catch(e => {
            callback(e, null);
          });
      } else {
        return callback({message: 'Some error accured while getting list of categories', details: syncResp, status: 500}, null);
      }

      if (syncErr === null && syncResp === null) {
        return callback({message: 'cannot get credentials', status: 500}, null);
      }
    });
  }

  private _saveCategoriesToLocalDb(categories: CbGroup[]) {
    return Promise.all(categories.map(cat => {
      return this.db.get(cat.uid)
        .then(r => {
          cat._id = r._id;
          cat._rev = r._rev;
          return this.db.put(cat);
        })
        .catch(e => {
          cat._id = cat.uid;
          return this.db.put(cat);
        })
        .catch(e => {
          return Promise.reject({message: 'Error on updating categories', cat: cat, status: 500, details: e});
        })
        .then(r => {
          return Promise.resolve({message: 'Records for categories are successfully updated.', status: 202});
        });
    }));
  }
}
