import * as http from 'https';

export class Request {
  public static post(options: http.RequestOptions, body: any, callback) {
    options.method = 'POST';
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (ch) => {
        chunks.push(ch);
      });

      res.on('end', () => {
        const respString = Buffer.concat(chunks).toString();
        try {
          callback(null, JSON.parse(respString));
        } catch (e) {
          callback(e, null);
        }
      });
    });

    req.on('error', (reqErr) => {
      callback(reqErr, null);
    });

    req.write(JSON.stringify(body));
    req.end();
  }

  public static get(options: http.RequestOptions, callback) {
    options.method = 'GET';

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (ch) => {
        chunks.push(ch);
      });

      res.on('end', () => {
        const respString = Buffer.concat(chunks).toString();
        try {
          callback(null, JSON.parse(respString));
        } catch (e) {
          callback(e, null);
        }
      });
    });

    req.on('error', (reqErr) => {
      callback(reqErr, null);
    });

    req.end();
  }
}
