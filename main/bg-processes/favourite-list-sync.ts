import { FileStorage } from '../utils/in-memory-store/filestorage';
import { FAVOURITE_LIST_SYNC_DB_NAME } from '../app-meta';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';


export class FavouriteListSync {
  db: typeof PouchDB;
  credStore: FileStorage;
  // number of synced items

  constructor(private _storePath, private _ldbPath) {
    this.credStore = new FileStorage(this._storePath);
  }

  start() {
    this.db = new PouchDB(this._ldbPath + '/' + FAVOURITE_LIST_SYNC_DB_NAME);
    this.credStore.getCredentials((credGetError, credentials) => {
      console.log('----- Starting cron to get favourite list at - ' + new Date());
      if (credGetError) {
        console.log('error getting credentials', credGetError);
        return;
      }

      this._getFavouriteList(credentials, (err, resp) => {
        console.log(err, resp);

        // if everything is ok, then reset counters
        if (resp) {
        }
      });
    });
  }

  private _getFavouriteList(credentials, callback) {
    // starting fav-list sync
    try {
      credentials = JSON.parse(credentials);
      const bgSync = new BgSyncRequests.FavouriteListSyncRequest(credentials);
      bgSync.getFavouriteList()
        .then(r => {
          if (r && r.status && r.status  === 401) {
            return callback(r, null);
          }

          if (r && r['status'] === 404) {
            return callback(r, null);
          }

          if (r && r['status'] === 500) {
            return callback(r, null);
          }

          if (r && r['status']) {
            return callback(r, null);
          }

          if (!(r['products'] && r['products'].length)) {
            return callback({message: 'Not found', Details: r, status: 404}, null);
          }

          if (r && r['products']) {
            this._saveFavouriteListToLocalDb(r['products'])
              .then(sR => {
                callback(null, true);
              })
              .catch(e => {
                callback(e, null);
              });
          } else {
            return callback({message: 'Some error accured while getting list of categories', details: r, status: 500}, null);
          }
        })
        .catch(e => {
          console.log('fav list get error', e);
        });
    } catch (e) {
      log.error(['Error on getting nomenclature favorite list', e]);
      callback(e, null);
    }
  }

  private _saveFavouriteListToLocalDb(uids: string[]) {
    const favProducts: any = {products: uids};
    return this.db.get('favorite-products')
      .then(r => {
        favProducts._id = r._id;
        favProducts._rev = r._rev;
        return this.db.put(favProducts);
      })
      .catch(e => {
        console.log('create fav', e);
        favProducts._id = 'favorite-products';
        return this.db.put(favProducts);
      })
      .catch(e => {
        return Promise.reject({message: 'Error on updating fav list', cat: favProducts, status: 500, details: e});
      })
      .then(r => {
        return Promise.resolve({message: 'Records for favorite products are successfully updated.', status: 202});
      });
  }
}
