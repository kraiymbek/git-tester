"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("https");
var Request = /** @class */ (function () {
    function Request() {
    }
    Request.post = function (options, body, callback) {
        options.method = 'POST';
        var req = http.request(options, function (res) {
            var chunks = [];
            res.on('data', function (ch) {
                chunks.push(ch);
            });
            res.on('end', function () {
                var respString = Buffer.concat(chunks).toString();
                try {
                    callback(null, JSON.parse(respString));
                }
                catch (e) {
                    callback(e, null);
                }
            });
        });
        req.on('error', function (reqErr) {
            callback(reqErr, null);
        });
        req.write(JSON.stringify(body));
        req.end();
    };
    Request.get = function (options, callback) {
        options.method = 'GET';
        var req = http.request(options, function (res) {
            var chunks = [];
            res.on('data', function (ch) {
                chunks.push(ch);
            });
            res.on('end', function () {
                var respString = Buffer.concat(chunks).toString();
                try {
                    callback(null, JSON.parse(respString));
                }
                catch (e) {
                    callback(e, null);
                }
            });
        });
        req.on('error', function (reqErr) {
            callback(reqErr, null);
        });
        req.end();
    };
    return Request;
}());
exports.Request = Request;
//# sourceMappingURL=request.js.map