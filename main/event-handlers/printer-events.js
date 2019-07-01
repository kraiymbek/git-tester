"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ThermalPrinter = require('./../node-printer/core').printer;
var PrinterTypes = require('./../node-printer/core').types;
var iconv = require('iconv').Iconv;
var moment = require('moment');
var s = new iconv('utf8', 'cp866');
var electron = require('electron');
var BrowserWindow = electron.BrowserWindow;
var event_handler_base_1 = require("./event-handler-base");
var backgroundsync_request_1 = require("../http-requests/backgroundsync-request");
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var PrinterEvents = /** @class */ (function (_super) {
    __extends(PrinterEvents, _super);
    function PrinterEvents(_userDataPath) {
        var _this = _super.call(this) || this;
        _this._userDataPath = _userDataPath;
        return _this;
    }
    // takes order and transfer data from client and saves it to
    // Local DB
    PrinterEvents.prototype.listenPrinterChange = function () {
        this.ipcMain.on('get-printer-list', function (event, arg) {
            var win = new BrowserWindow({ show: false });
            var contents = win.webContents;
            var printers = contents.getPrinters();
            event.sender.send('get-printer-list-resp', { printers: printers });
        });
    };
    PrinterEvents.prototype.listenPrinterData = function () {
        var _this = this;
        this.ipcMain.on('on-receipt-data', function (event, data) {
            var transaction = data['transaction'];
            var invoice = transaction['invoice'];
            var newOrderList = [];
            invoice['items'].forEach(function (item) {
                var newOrderItem = {
                    amount: item['quantity'],
                    name: item['name'],
                    price: item['cost'],
                    uid: item['code'],
                    unit: item['unit'],
                };
                newOrderList.push(newOrderItem);
            });
            var printData = {
                items: newOrderList,
                receivedSum: transaction['receivedSum'],
                totalPrice: transaction['amount'],
                isToPrint: true,
                printerName: data['printerName'],
                merchantInfo: data.merchantInfo,
                cashierName: transaction['cashierName'],
                payType: invoice['paymentType'],
                createdDate: transaction['createdDate'],
            };
            _this.sendToPrint(_this._userDataPath, transaction['terminalId'], transaction['invoiceId'], 'GET', printData, transaction['checkFiscal'], function (message) {
                event.sender.send('on-receipt-data-resp', message);
            });
        });
    };
    PrinterEvents.prototype.sendToPrint = function (userDataPath, terminalId, invoiceId, requestType, printData, isFiscal, cb) {
        var _this = this;
        var credStore = new filestorage_1.FileStorage(userDataPath);
        credStore.getCredentials(function (credGetError, credentials) {
            credentials = JSON.parse(credentials);
            var webkassaReq = new backgroundsync_request_1.BgSyncRequests.WebkassaRequest(credentials);
            if (printData && printData.isToPrint && isFiscal) {
                if (requestType === 'POST') {
                    // post request
                    _this.postWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, function (result) {
                        cb(result);
                    });
                }
                else {
                    // get request
                    _this.getWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, function (result) {
                        cb(result);
                    });
                }
                return;
            }
            if (printData && printData['isToPrint']) {
                _this.doPrint(printData)
                    .then(function (res) {
                    if (res) {
                        cb({ status: 200, message: res });
                    }
                })
                    .catch(function (err) {
                    cb({ status: 400, message: err, errorType: 'printer' });
                });
                return;
            }
            if (isFiscal) {
                webkassaReq.postWebkassaInfo(terminalId, invoiceId, 2)
                    .then(function (data) {
                    if (data && !data['message']) {
                        cb({ status: 200, message: 'Webkassa data was saved' });
                    }
                })
                    .catch(function (err) {
                    cb({ status: 400, message: 'posting either failed or timeout' });
                });
                return;
            }
            cb({ message: 'no conditions' });
        });
    };
    PrinterEvents.prototype.postWebkassaData = function (terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, cb) {
        var _this = this;
        this.promiseTimeout(13000, webkassaReq.postWebkassaInfo(terminalId, invoiceId, 2))
            .then(function (data) {
            if (data && !data['message']) {
                _this.doPrint(printData, isFiscal, data)
                    .then(function (res) {
                    if (res) {
                        cb({ status: 200, message: res });
                        return;
                    }
                    cb({ status: 400, message: 'not fiscal data' });
                })
                    .catch(function (err) {
                    // in case or err print default receipt
                    _this.doPrint(printData)
                        .then(function (res) {
                        if (res) {
                            cb({ status: 200, message: res });
                        }
                    })
                        .catch(function (error) {
                        cb({ status: 400, message: error, errorType: 'printer' });
                    });
                });
                return;
            }
            _this.doPrint(printData)
                .then(function (res) {
                if (res) {
                    cb({ status: 200, message: 'no fiscal data' });
                }
            })
                .catch(function (error) {
                cb({ status: 400, message: error, errorType: 'printer' });
            });
        })
            .catch(function (err) {
            _this.doPrint(printData)
                .then(function (res) {
                if (res) {
                    cb({ status: 200, message: 'posting webkassa data was either failed or timeout' });
                }
            })
                .catch(function (error) {
                cb({ status: 400, message: error, errorType: 'printer' });
            });
        });
    };
    PrinterEvents.prototype.getWebkassaData = function (terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, cb) {
        var _this = this;
        webkassaReq.getWebkassaInfo(terminalId, invoiceId, 2)
            .then(function (data) {
            if (data && !data['message']) {
                _this.doPrint(printData, isFiscal, data)
                    .then(function (res) {
                    if (res) {
                        cb({ status: 200, message: res });
                    }
                })
                    .catch(function (err) {
                    _this.doPrint(printData)
                        .then(function (res) {
                        if (res) {
                            cb({ status: 200, message: res });
                        }
                    })
                        .catch(function (error) {
                        cb({ status: 400, message: error, errorType: 'printer' });
                    });
                });
                return;
            }
            // IN CASE OF NO FISCAL DATA
            _this.postWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, function (result) {
                cb(result);
            });
        })
            .catch(function (err) {
            _this.doPrint(printData)
                .then(function (res) {
                if (res) {
                    cb({ status: 200, message: 'posting webkassa data was either failed or timeout' });
                }
            })
                .catch(function (error) {
                cb({ status: 400, message: error, errorType: 'printer' });
            });
        });
    };
    PrinterEvents.prototype.doPrint = function (printData, isFiscal, webkassaData) {
        var printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            characterSet: 'SPAIN1',
            interface: "printer:" + (printData.printerName ? printData.printerName : 'TSC TTP-244'),
            width: 32,
        });
        if (printData && printData['isToPrint'] && printer.isPrinterConnected()) {
            printer.alignCenter();
            printer.bold(true);
            printer.println(s.convert('ТОВАРНЫЙ ЧЕК'));
            printer.bold(false);
            printer.newLine();
            printer.println(s.convert(printData.merchantInfo.merchantMainDetail.brand));
            printer.println(s.convert("\u0411\u0418\u041D " + printData.merchantInfo.legalDetail.legalId));
            printer.alignRight();
            printer.println(s.convert(printData.cashierName));
            printer.alignLeft();
            printer.println(s.convert('ПРОДАЖА'));
            printer.drawLine();
            printData.items.forEach(function (item, index) {
                printer.println(Buffer.concat([Buffer.from((index + 1) + '. '), s.convert(item.name)]));
                printer.newLine();
                printer.leftRight('   ' + item.amount + ' x ' + item.price, item.amount * item.price + '');
                printer.customLeftCyrrilicOriented('   Стоимость', s.convert('   Стоимость'), item.amount * item.price + '');
                printer.alignLeft();
                printer.print('  -----------------------------');
                printer.newLine();
            });
            printer.newLine();
            printer.drawLine();
            printer.newLine();
            printer.customLeftCyrrilicOriented("" + (printData.payType === 'CASH' ? 'Наличные' : 'Карта'), s.convert(printData.payType === 'CASH' ? 'Наличные' : 'Карта'), printData.receivedSum + '');
            printer.customLeftCyrrilicOriented('Сдача', s.convert('Сдача'), (printData.receivedSum - printData.totalPrice) + '');
            printer.bold(true);
            printer.customLeftCyrrilicOriented('ИТОГО', s.convert('ИТОГО'), printData.totalPrice + '');
            printer.bold(false);
            printer.customLeftCyrrilicOriented('В т.ч. НДС', s.convert('В т.ч. НДС'), Math.floor(printData.totalPrice * 0.12) + '');
            printer.newLine();
            printer.drawLine();
            if (isFiscal && webkassaData) {
                printer.println(s.convert("\u0424\u0438\u0441\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u0440\u0438\u0437\u043D\u0430\u043A: " + webkassaData.chequeResponse.Data.CheckNumber));
            }
            if (printData.createdDate) {
                printer.println(Buffer.concat([s.convert('Дата: '), Buffer.from(moment(printData.createdDate).format('DD.MM.YYYY, HH:mm:ss'))]));
            }
            else {
                printer.println(Buffer.concat([s.convert('Дата: '), Buffer.from(moment().format('DD.MM.YYYY, HH:mm:ss'))]));
            }
            if (isFiscal && webkassaData) {
                printer.println(s.convert("\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440 \u0444\u0438\u0441\u043A\u0430\u043B\u044C\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445:"));
                printer.println(s.convert("AO \"\u041A\u0430\u0437\u0430\u0445\u0442\u0435\u043B\u0435\u043A\u043E\u043C\""));
            }
            printer.drawLine();
            printer.newLine();
            printer.alignCenter();
            if (isFiscal && webkassaData) {
                printer.println(s.convert("\u0418\u041D\u041A " + webkassaData.chequeResponse.Data.Cashbox.IdentityNumber));
                printer.println(s.convert("\u0420\u041D\u041A " + webkassaData.chequeResponse.Data.Cashbox.RegistrationNumber));
                printer.println(s.convert("\u0417\u041D\u041A " + webkassaData.chequeResponse.Data.Cashbox.UniqueNumber));
                printer.newLine();
            }
            printer.println(s.convert('***СПАСИБО ЗА ПОКУПКУ***'));
            printer.println(s.convert('АВТОМАТИЗИРОВАНО С ПОМОЩЬЮ FORTE KASSA'));
            printer.newLine();
            printer.newLine();
            printer.newLine();
            printer.newLine();
            return new Promise(function (res, err) {
                printer.execute().then(function (data) {
                    res('Print success.');
                }).catch(function (error) {
                    err(error);
                });
            });
        }
    };
    PrinterEvents.prototype.promiseTimeout = function (ms, promise) {
        return new Promise(function (resolve, reject) {
            // create a timeout to reject promise if not resolved
            var timer = setTimeout(function () {
                reject(new Error('timeout'));
            }, ms);
            promise
                .then(function (res) {
                clearTimeout(timer);
                resolve(res);
            })
                .catch(function (err) {
                clearTimeout(timer);
                reject(err);
            });
        });
    };
    return PrinterEvents;
}(event_handler_base_1.EventHandlerBase));
exports.PrinterEvents = PrinterEvents;
//# sourceMappingURL=printer-events.js.map