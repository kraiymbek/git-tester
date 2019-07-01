import { APP_SQL_DB_NAME, NOMEN_LIST_TABLE_NAME } from '../../app-meta';
import { SqlConnection } from '../../utils/sql-connection';

const PouchDB  = require('pouchdb-node');
PouchDB.plugin(require('pouchdb-find'));

export interface Nomenclature {
  _id?: string; // local db id
  _rev?: string; // local db changes id for doc
  uid: string;
  merchant_id: string;
  name: string;
  amount: number;
  price: number;
  stock_id: string[];
  articul: string;
  status: string;
  bar_code?: string[];
  group_id?: string[];
  created_on: Date;
  updated_on: Date;
  scope: string[];
  is_visible: boolean;
  available: boolean;
  barcode?: string;
  stockId?: string;
  groupId?: string;
  unit?: string;
}

export interface NomenSearchQuery {
  type: NomenSearchTypes;
  value: any;
  stock?: string;
}

export enum NomenSearchTypes {
  // ew - everywhere
  name = 'name', articul = 'articul', bar_code = 'bar_code', 'ew' = 'ew',
}

export interface NomenFilter {
  from?: number;
  size?: number;
  stock?: string;
  query_name_article_barcode?: string;
  merchant_id?: string;
  group_id?: string;
  up_updated?: string;
  min_price?: number;
  max_price?: number;
  barcodes?: string[];
  bar_code?: string;
  sort?: NomenSortTypes;
}

export enum NomenSortTypes {
  updated_on = 'updated_on',
  name = 'name',
}

export class NomenRepository {
  db: any;
  sqlDb: SqlConnection;
  nomenListTable = NOMEN_LIST_TABLE_NAME;
  error: any;

  constructor(private _ldbPath: string, useNosql?: boolean) {
    if (useNosql) {
      this.db = new PouchDB(this._ldbPath);
      return;
    }

    if (!this.sqlDb) {
     this.sqlDb = new SqlConnection(this._ldbPath + '/' + APP_SQL_DB_NAME + '.db');
    }
  }

  public closeDb() {
    return this.sqlDb.close();
  }

  public search(query: NomenSearchQuery): Promise<any[]> {
    const queryValue: string = query.value;
    const stock = query.stock;

    let sql = 'select * from nomenlist where ((name_to_search) '
      + ' like (' + '"%' + queryValue.toLocaleLowerCase() + '%"' + ')'
      + 'or (bar_code)' +
      ' like (' + '"%' + queryValue + '%"' + '))';

    if (stock) {
      sql += ' and stock_id = ' + '"' + stock + '"';
    }

    return this.sqlDb.all(sql);
  }

  public filter(nomenFilter: NomenFilter) {
    let sql;

    let query_name_article_barcode = nomenFilter.query_name_article_barcode;
    const stock_id = nomenFilter.stock;

    sql = `select * from ${this.nomenListTable} where stock_id = "${stock_id}"`;

    // filtering by category
    if (nomenFilter.group_id) {
      sql += ' and group_id =' + '"' + nomenFilter.group_id + '"';
    }

    if (nomenFilter.sort) {
      sql += ` ORDER BY ${nomenFilter.sort} DESC`;
    }

    sql += ` limit ${nomenFilter.size} offset ${nomenFilter.from}`;

    if (query_name_article_barcode) {
      query_name_article_barcode = query_name_article_barcode.replace(/['"\n]g/, '');
      sql = 'select * from ' + this.nomenListTable + ' where (name = ' + '"' +
        query_name_article_barcode + '"' + ' OR bar_code = '
        + '"' + query_name_article_barcode + '"' + ') AND stock_id ='
        + '"' + stock_id + '"';
    }

    return this.sqlDb.all(sql)
      .then(r => {
        const resp = {nomenclature: r, total_hits: 0, status: 200};
        if (!r.length) {
          return Promise.reject({message: 'Error', status: 404, Error: 'Not found'});
        }

        return this._getTotalNomenByFilter(nomenFilter)
          .then(count => {
            resp.total_hits = count['count(*)'];
            return Promise.resolve(resp);
          });
      });
  }

  public saveNomenclaturesToLocalDb(nomenclatures: Nomenclature[], isNosql?: boolean): Promise<any> {
    if (isNosql) {
      return this._saveToNosql(nomenclatures);
    }

    return this._saveToSql(nomenclatures);
  }

  private _saveToSql(nomenclatures: Nomenclature[]): Promise<any>  {
    if (this.error) {
      return Promise.reject(this.error);
    }

    return this._createTable()
      .then(r => {
        return this._updateNomenclature(nomenclatures);
      }).then(r => {
        // inserting to db res
        // closing db to avoid memory leak
        return this.closeDb()
          .then(closeR => Promise.resolve(r))
          .catch(e => Promise.reject({message: 'Error closing db', Error: e, status: 500}));
      })
      .catch(e => {
        let eResp = {message: 'Error', Error: e, status: 500};
        if (e.status) {
          eResp = e;
        }
        return Promise.reject(eResp);
      });
  }

  public updatePrice(uid: string, price: number) {
    const sqlStmt = `UPDATE ${this.nomenListTable} SET price = ${price} WHERE uid = "${uid}"`;

    return this.sqlDb.run(sqlStmt)
      .then(r => {
        return Promise.resolve({message: 'Ok', status: 201, details: r});
      })
      .catch(e => {
        return Promise.reject({message: 'Error', Error: e, status: 500});
      });
  }

  private _updateNomenclature(nomenclatures: Nomenclature[]) {
    // check if exist in table;
     // if not exists then insert new
   // if exist update row
    const sqlInserOrUpdate = `INSERT OR REPLACE INTO ${this.nomenListTable}
       (id, uid, name_to_search, name, merchant_id,  amount, price, stock_id, bar_code, group_id, unit, created_on, updated_on) VALUES`;
    let stmtValue = '';

    nomenclatures.forEach((nomen, index) => {
      const stockId = nomen.stock_id && nomen.stock_id.length ? nomen.stock_id[0] : '';
      let barcode = '';
      if (nomen.bar_code) {
        barcode = nomen.bar_code.length ? nomen.bar_code[0] : '';
      }
      const groupId = nomen.group_id && nomen.group_id.length ? nomen.group_id[0] : '';
      const name = nomen.name.replace(/["']/g, '');
      const name_to_search = name.toLocaleLowerCase();
      const unit = nomen.unit ? '"' + nomen.unit + '"' : '""';
      const merchantId  = nomen.merchant_id;

      stmtValue += '(' + '"' + nomen.uid + '"' + ',' + '"' + nomen.uid + '"' + ','
        + '"' + name_to_search + '",'
        + '"' + name + '"' + ','
        + '"' + merchantId + '"' + ','
        + nomen.amount + ','
        + nomen.price + ','
        + '"' + stockId + '"' + ','
        + '"' + barcode + '"' + ','
        + '"' + groupId + '"' + ','
        + unit + ','
        + '"' + nomen.created_on + '"' + ','
        + '"' + nomen.updated_on + '")';

      if (!(nomenclatures.length - 1 === index)) {
        stmtValue  += ',';
      }
    });

    return this.sqlDb.run(sqlInserOrUpdate + stmtValue)
      .then(r => {
        return Promise.resolve({message: 'Ok', status: 201, details: r});
      })
      .catch(e => Promise.reject({message: 'Error', Error: e, status: 500}));
  }

  private _createTable(): Promise<any> {
    const sql = `CREATE TABLE IF NOT EXISTS ${this.nomenListTable} (
        id TEXT UNIQUE,
        uid TEXT PRIMARY KEY,
        name_to_search TEXT collate nocase,
        name TEXT collate nocase,
        merchant_id TEXT,
        amount INTEGER,
        price INTEGER,
        stock_id TEXT,
        bar_code TEXT collate nocase,
        group_id TEXT,
        unit TEXT NOT NULL,
        created_on TEXT,
        updated_on TEXT)`;
    return this.sqlDb.run(sql);
  }

  private _saveToNosql(nomenclatures: Nomenclature[]): Promise<any> {
    return Promise.all(nomenclatures.map(nomen => {
      return this.db.get(nomen.uid)
        .then(r => {
          nomen._id = r._id;
          nomen._rev = r._rev;
          nomen.barcode = r.bar_code && r.bar_code.length ? r.bar_code[0] : '';
          nomen.stockId = r.stock_id && r.stock_id.length ? r.stock_id[0] : '';
          nomen.groupId = r.group_id && r.group_id.length ? r.group_id[0] : '';
          return this.db.put(nomen);
        })
        .catch(() => {
          nomen._id = nomen.uid;
          nomen.barcode = nomen.bar_code && nomen.bar_code.length ? nomen.bar_code[0] : '';
          nomen.stockId = nomen.stock_id && nomen.stock_id.length ? nomen.stock_id[0] : '';
          nomen.groupId = nomen.group_id && nomen.group_id.length ? nomen.group_id[0] : '';
          return this.db.put(nomen);
        })
        .catch(e => {
          return Promise.reject({message: 'Error on updating nomenclature', nomen: nomen, status: 500, details: e});
        })
        .then(r => {
          return Promise.resolve({message: 'Records for nomenclatures are successfully updated.', status: 202});
        });
    }));
  }

  private _getTotalNomenByFilter(filter: NomenFilter): Promise<any> {
    let sql = `select count(*) from ${this.nomenListTable} where stock_id = "${filter.stock}" `;

    if (filter.group_id) {
      sql += ' and group_id =' + '"' + filter.group_id + '"';
    }

    return this.sqlDb.get(sql);
  }
}

