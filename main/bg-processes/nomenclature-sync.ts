

import {
  INITIAL_NOMEN_SYNC_DATE,
  LAST_UPD_PRODUCT_DATE_FILE_NAME,
} from '../app-meta';

import { NomenFilter, NomenRepository } from '../models/nomenclatures/nomen-repository';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';
import { FileStorage } from '../utils/in-memory-store/filestorage';
const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

/*
* singleton class
* */
export class NomenclatureSync {
  private static _instance: NomenclatureSync | null;
  private isSyncing = false;
  private _nomenRepo: NomenRepository;

  credStore: FileStorage;
  totalNumber = 1;
  // number of synced items
  currentNumber = 0;

  private constructor(private _storePath?: string, private _ldbPath?: string, private _useNosqlDB?: boolean) {
    if (_storePath) {
      this.credStore = new FileStorage(this._storePath);
    }
  }

  public static getInstace(_storePath, _ldbPath, _useNosqlDB?: boolean): NomenclatureSync {
    if (!this._instance) {
      this._instance = new NomenclatureSync(_storePath, _ldbPath, _useNosqlDB);
    }
    return this._instance;
  }

  public static stop() {
    this._instance = null;
  }

  start() {
    this.credStore.getCredentials((credGetError, credentials) => {
      if (credGetError) {
        return log.info('error getting credentials', credGetError);
      }

      log.info('nomen list sync started');
      const filter: NomenFilter = {
        size: 1000,
      };

      this.credStore.getDataFromFile(LAST_UPD_PRODUCT_DATE_FILE_NAME, (errRead, date) => {
        if (errRead) {
          filter.up_updated = INITIAL_NOMEN_SYNC_DATE;
        }

        if (date) {
          try {
            date = JSON.parse(date);
            filter.up_updated = date.lastUpdatedProductDate;
          } catch (e) {
            filter.up_updated = INITIAL_NOMEN_SYNC_DATE;
            log.error(['Error parsing nomenclature date: details - ' + date, e]);
          }
        }

        try {
          credentials = JSON.parse(credentials);
          if (!this.isSyncing) {
            this.isSyncing = true;
            this._getNomenclatures(filter, credentials, (err, resp) => {
              this.isSyncing = false;

              // if everything is ok, then reset counters
              if (resp) {
                this.totalNumber = 1;
                this.currentNumber = 0;
              }

              if (err) {
                log.error(['Error updateing nomens db', err]);
              }
            });
          }
        } catch (e) {
          log.info('NOMEN SYNC ERROR: error parsing credentials json', e);
        }
      });
    });
  }

  private _getNomenclatures(filter: NomenFilter, credentials, callback) {
    // start nomenclature sync
    const bgSync = new BgSyncRequests.NomenclatureSyncRequest(credentials);

    if (this.totalNumber > 0) {
      bgSync.getNomenList( filter, (syncErr, syncResp) => {
        if (syncErr) {
          return callback(syncErr, null);
        }

        if (syncErr === null && syncResp === null) {
          return callback({message: 'not valid credentials, while syncing nomen list', status: 500, isLog: true }, null);
        }

        if (syncResp) {
          if (syncResp.nomenclature !== null) {
            if (!syncResp.nomenclature) {
              return callback(syncResp, null);
            } else {
              this.currentNumber += syncResp.nomenclature.length;
              this.totalNumber = syncResp.total_hits - 1;

              filter.up_updated = syncResp.nomenclature[syncResp.nomenclature.length - 1].updated_on;
              // console.log('number of synced items out of - ' +  totalNumber, currentNumber);

              const lastItemDate = {
                lastUpdatedProductDate: filter.up_updated,
                lastUpdatedProduct: syncResp.nomenclature[syncResp.nomenclature.length - 1],
              };

              // save to local db
              this._nomenRepo = new NomenRepository(this._ldbPath, this._useNosqlDB);

              this._nomenRepo.saveNomenclaturesToLocalDb(syncResp.nomenclature)
                .then(r => {
                  if (r && r.length) {

                  }
                  this.credStore.saveDataToFile(LAST_UPD_PRODUCT_DATE_FILE_NAME, lastItemDate, (err, resp) => {
                    if (err) {
                      return callback(err, null);
                    }
                    if (resp) {
                      this._getNomenclatures(filter, credentials, callback);
                    }
                  });
                }).catch(e => {
                  callback(e, null);
                });
            }
          }
        }
      });
    } else {
      callback(null, true);
    }
  }
}
