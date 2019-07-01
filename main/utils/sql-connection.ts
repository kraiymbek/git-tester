const sqlite3 = require('sqlite3');

const log = require('electron-log');
log.transports.file.level = 'info';
log.transports.console.level = 'info';

export class SqlConnection {
  db: typeof sqlite3;
  constructor(dbPath, cb?: (err: Error | null) => void) {
    this.db = new sqlite3.Database(dbPath,  e => {
      if (e) {
        log.error(['error on db connections', e]);
      }

      if (cb) {
        cb(e);
      }
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          log.error('Error running sql: ' + sql);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, params = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          log.error(['Error running sql: ' , sql]);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // run sql statement
  run(sql, params = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          log.error(['Error running sql ',  err]);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close(closeErr => {
        if (closeErr) {
          log.error(['error on closing db', closeErr]);
          reject(closeErr);
        }
        resolve(closeErr);
      });
    });
  }
}
