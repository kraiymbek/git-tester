const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

import { EventHandlerBase } from './event-handler-base';
import {
  CATEGORIES_LIST_SYNC_DB_NAME, FAVOURITE_LIST_SYNC_DB_NAME, NOMEN_LIST_SYNC_DB_NAME
} from '../app-meta';
import { Nomenclature, NomenFilter,
  NomenRepository, NomenSearchQuery } from '../models/nomenclatures/nomen-repository';

export class NomenEventHandler extends EventHandlerBase {
  db: typeof PouchDB;

  constructor(private _dataBasePath: string) {
    super();
  }

  clientIPCListener() {
    // fetches nomen list according to filter and sends to renderer process
    this.ipcMain.on('get-all-nomens', (event, filter) => {

      const nomenFilter: NomenFilter = <NomenFilter>filter;

      const selector: any = {};

      selector.stockId = nomenFilter.stock ? nomenFilter.stock : {};

      if (nomenFilter.query_name_article_barcode) {
        selector.barcode = nomenFilter.query_name_article_barcode;
      }

      if (nomenFilter.group_id) {
        selector.groupId = nomenFilter.group_id;
      }

      const query: any = {};
      query.selector = selector;
      query.limit = nomenFilter.size;
      query.skip = nomenFilter.from;

      const nomenRepo = new NomenRepository(this._dataBasePath);
      nomenRepo.filter(nomenFilter)
        .then(r => {
          event.sender.send('get-all-nomens-resp', r);
        })
        .catch(e => {
          log.error(['error getting nomen by filter', e]);
          const resp = e;
          if (!e.status) {
            resp.message = e;
            resp.status = 500;
          }
          event.sender.send('get-all-nomens-resp', resp);
      });
    });

    // fetches group list according to filter and sends to renderer process
    this.ipcMain.on('get-all-groups', (evt, filter) => {
      this.db = new PouchDB(this._dataBasePath + '/' + CATEGORIES_LIST_SYNC_DB_NAME);
      this.db.find({
        selector: {
          merchant_id: filter.merchant_id,
        },
        limit: filter.size,
        skip: filter.from,
      }).then(r => {
        let resp: any = {message: 'ok', status: 404, details: r};
        if (r.docs && r.docs.length) {
          resp = {
            groups: <Nomenclature>r.docs,
            status: 200,
          };

          return this.db.info()
            .then(i => {
              resp.total_hits = i.doc_count;
              resp.update_seq = i.update_seq;

              return Promise.resolve(resp);
            })
            .catch(iE => {
              return Promise.reject(iE);
            });
        }
        return Promise.reject(resp);
      })
      .then(r => {
        evt.sender.send('get-all-groups-resp', r);
      })
      .catch(e => {
        const resp = e;
        if (!e.status) {
          resp.message = e;
          resp.status = 500;
        }
        evt.sender.send('get-all-groups-resp', resp);
      });
    });

    // favourite list
    this.ipcMain.on('favourite-list-get', (evt) => {
      this.db = new PouchDB(this._dataBasePath + '/' + FAVOURITE_LIST_SYNC_DB_NAME);
      const mgetDb = new PouchDB(this._dataBasePath + '/' + NOMEN_LIST_SYNC_DB_NAME);

      this.db.get('favorite-products')
        .then(rF => {
          return mgetDb.allDocs({
            include_docs: true,
            keys: rF['products'],
          }).then(r => {
            let nomenList = r.rows.filter(nomen => nomen.id !== undefined);
            nomenList = nomenList.map(n => n.doc);
            return Promise.resolve(nomenList);
          }).catch(e => {
            return Promise.resolve({message: 'Error', details: e, status: 500});
          });
        })
        .then(r => {
          evt.sender.send('favourite-list-get-resp', r);
        })
        .catch(e => {
          evt.sender.send('favourite-list-get-resp', {message: 'Error', details: e, status: 500});
        });
    });

    // mget - getting list of nomenclatures by ids
    this.ipcMain.on('nomen-list-mget', (evt, data: {uids: string[]}) => {
      this.db = new PouchDB(this._dataBasePath + '/' + NOMEN_LIST_SYNC_DB_NAME);
      this.db.allDocs({
        include_docs: true,
        keys: data.uids,
      }).then(r => {
          let nomenList = r.rows.filter(nomen => nomen.id !== undefined);
          nomenList = nomenList.map(n => n.doc);
          evt.sender.send('nomen-list-mget-resp', {nomenclatures: nomenList, status: 200});
        })
        .catch(e => {
          evt.sender.send('nomen-list-mget-resp', {message: 'Error', details: e, status: 500});
        });
    });

    this.ipcMain.on('search-nomen', (evt, query: NomenSearchQuery) => {
      const nomenRepo = new NomenRepository(this._dataBasePath);

      // leave only letters and digits
      // query.value = query.value.replace(/[^a-zA-Z0-9А-Яа-я ]+/g, '');
      nomenRepo.search(query)
        .then(r => {
          const resp = {
            status: 200,
            nomenclature: r,
            total_hits: r.length,
          };
          evt.sender.send('search-nomen-resp', resp);
        })
        .catch(e => {
          log.error(['Error on searching', e]);
        });
    });

    this.ipcMain.on('get-total-search', (evt, query: NomenFilter) => {
      const regExVal = query.query_name_article_barcode.replace(/[^a-zA-Z0-9А-Яа-я]+/g, '');

      this.db.find({
        selector: {
          $or: [{barcode: query.query_name_article_barcode}, {name: {$regex: RegExp(regExVal, 'i')}}],
          stockId: query.stock,
        },
        fields: ['_id'],
      }).then(all => {
        evt.sender.send('get-total-search-resp', {total_hits: all.docs.length});
      }).catch(e => {
        console.log('error getting length', e);
      });
    });

    this.ipcMain.on('update-nomen-price', (evt, nomen: {uid: string, price: number}) => {
      const nomenRepo = new NomenRepository(this._dataBasePath);
      nomenRepo.updatePrice(nomen.uid, nomen.price)
        .then(r => {
          evt.sender.send('update-nomen-price-resp', r);
        })
        .catch(e => {
          evt.sender.send('update-nomen-price-resp', null);
        });
    });
  }
}
