import { PrintData, Webkassa } from '../models/transactions/orders';
const ThermalPrinter = require('./../node-printer/core').printer;
const PrinterTypes = require('./../node-printer/core').types;
const iconv  = require('iconv').Iconv;
const moment = require('moment');
const s = new iconv('utf8', 'cp866');

const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;

import { EventHandlerBase } from './event-handler-base';
import { BgSyncRequests } from '../http-requests/backgroundsync-request';
import { FileStorage } from '../utils/in-memory-store/filestorage';


export class PrinterEvents  extends EventHandlerBase {
  constructor(private _userDataPath: string) {
    super();
  }

  // takes order and transfer data from client and saves it to
  // Local DB
  listenPrinterChange() {
    this.ipcMain.on('get-printer-list', (event, arg) => {

      const win = new BrowserWindow({ show: false });
      const contents = win.webContents;
      const printers = contents.getPrinters();
      event.sender.send('get-printer-list-resp', { printers: printers});
    });
  }

  listenPrinterData() {
    this.ipcMain.on('on-receipt-data', (event, data) => {
      const transaction = data['transaction'];
      const invoice = transaction['invoice'];
      const newOrderList: any = [] ;
      invoice['items'].forEach(item => {
        const newOrderItem = {
          amount: item['quantity'],
          name: item['name'],
          price: item['cost'],
          uid: item['code'],
          unit: item['unit'],
        };
        newOrderList.push(newOrderItem);
      });

      const printData: PrintData = {
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

      this.sendToPrint(
        this._userDataPath,
        transaction['terminalId'],
        transaction['invoiceId'],
        'GET', printData,
        transaction['checkFiscal'], message => {
          event.sender.send('on-receipt-data-resp', message);
      });
    });
  }


  sendToPrint(
    userDataPath: string,
    terminalId: string,
    invoiceId: string,
    requestType: string,
    printData: PrintData,
    isFiscal: boolean,
    cb,
    ) {
    const credStore = new FileStorage(userDataPath);
    credStore.getCredentials((credGetError, credentials) => {

      credentials = JSON.parse(credentials);
      const webkassaReq = new BgSyncRequests.WebkassaRequest(credentials);

      if (printData && printData.isToPrint && isFiscal) {
        if (requestType === 'POST') {
          // post request
         this.postWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, result => {
           cb(result);
         });

        } else {
          // get request
          this.getWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, result => {
            cb(result);
          });
        }

        return;
      }


      if (printData && printData['isToPrint']) {
        this.doPrint(printData)
          .then((res) => {
            if (res) {
              cb({status: 200, message: res});
            }
          })
          .catch(err => {
            cb({status: 400, message: err, errorType: 'printer'});
          });
        return;
      }

      if (isFiscal) {
        webkassaReq.postWebkassaInfo(terminalId, invoiceId, 2)
          .then((data: Webkassa) => {
            if (data && !data['message']) {
              cb({status: 200, message: 'Webkassa data was saved'});
            }
          })
          .catch(err => {
            cb({status: 400, message: 'posting either failed or timeout'});
          });
        return;
      }

      cb({message: 'no conditions'});
    });
  }


  postWebkassaData( terminalId: string,
                    invoiceId: string,
                    requestType: string,
                    printData: PrintData,
                    isFiscal: boolean,
                    webkassaReq,
                    cb) {
    this.promiseTimeout(13000, webkassaReq.postWebkassaInfo(terminalId, invoiceId, 2))
      .then((data: Webkassa) => {
        if (data && !data['message']) {
          this.doPrint(printData, isFiscal, data)
            .then((res) => {
              if (res) {
                cb({status: 200, message: res});
                return;
              }

              cb({status: 400, message: 'not fiscal data'});
            })
            .catch(err => {
              // in case or err print default receipt
              this.doPrint(printData)
                .then((res) => {
                  if (res) {
                    cb({status: 200, message: res});
                  }
                })
                .catch(error => {
                  cb({status: 400, message: error, errorType: 'printer'});
                });
            });
          return;
        }

        this.doPrint(printData)
          .then((res) => {
            if (res) {
              cb({status: 200, message: 'no fiscal data'});
            }
          })
          .catch(error => {
            cb({status: 400, message: error, errorType: 'printer'});
          });
      })
      .catch(err => {
        this.doPrint(printData)
          .then((res) => {
            if (res) {
              cb({status: 200, message: 'posting webkassa data was either failed or timeout'});
            }
          })
          .catch(error => {
            cb({status: 400, message: error, errorType: 'printer'});
          });
      });
  }


  getWebkassaData(terminalId: string,
                  invoiceId: string,
                  requestType: string,
                  printData: PrintData,
                  isFiscal: boolean,
                  webkassaReq,
                  cb) {
    webkassaReq.getWebkassaInfo(terminalId, invoiceId, 2)
      .then((data: Webkassa) => {
        if (data && !data['message']) {
          this.doPrint(printData, isFiscal, data)
            .then((res) => {
              if (res) {
                cb({status: 200, message: res});
              }
            })
            .catch(err => {
              this.doPrint(printData)
                .then((res) => {
                  if (res) {
                    cb({status: 200, message: res});
                  }
                })
                .catch(error => {
                  cb({status: 400, message: error, errorType: 'printer'});
                });
            });
          return;
        }

        // IN CASE OF NO FISCAL DATA
        this.postWebkassaData(terminalId, invoiceId, requestType, printData, isFiscal, webkassaReq, result => {
          cb(result);
        });
      })
      .catch(err => {
        this.doPrint(printData)
          .then((res) => {
            if (res) {
              cb({status: 200, message: 'posting webkassa data was either failed or timeout'});
            }
          })
          .catch(error => {
            cb({status: 400, message: error, errorType: 'printer'});
          });
      });
  }


  doPrint(printData: PrintData, isFiscal?: boolean, webkassaData?: Webkassa) {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      characterSet: 'SPAIN1',
      interface: `printer:${printData.printerName ? printData.printerName : 'TSC TTP-244'}`,
      width: 32,
    });

    if (printData && printData['isToPrint'] && printer.isPrinterConnected()) {
        printer.alignCenter();
        printer.bold(true);
        printer.println(s.convert('ТОВАРНЫЙ ЧЕК'));
        printer.bold(false);
        printer.newLine();
        printer.println(s.convert(printData.merchantInfo.merchantMainDetail.brand));
        printer.println(s.convert(`БИН ${printData.merchantInfo.legalDetail.legalId}`));
        printer.alignRight();
        printer.println(s.convert(printData.cashierName));
        printer.alignLeft();
        printer.println(s.convert('ПРОДАЖА'));
        printer.drawLine();


        printData.items.forEach((item, index) => {
          printer.println(Buffer.concat([Buffer.from((index + 1) + '. '), s.convert(item.name)]));
          printer.newLine();
          printer.leftRight('   ' + item.amount + ' x ' + item.price, item.amount * item.price + '');
          printer.customLeftCyrrilicOriented('   Стоимость', s.convert('   Стоимость') , item.amount * item.price + '');
          printer.alignLeft();
          printer.print('  -----------------------------');
          printer.newLine();
        });

        printer.newLine();
        printer.drawLine();
        printer.newLine();
        printer.customLeftCyrrilicOriented(`${printData.payType === 'CASH' ? 'Наличные' : 'Карта'}`,
          s.convert(printData.payType === 'CASH' ? 'Наличные' : 'Карта'), printData.receivedSum + '');
        printer.customLeftCyrrilicOriented('Сдача', s.convert('Сдача'), (printData.receivedSum - printData.totalPrice) + '');
        printer.bold(true);
        printer.customLeftCyrrilicOriented('ИТОГО', s.convert('ИТОГО'), printData.totalPrice + '');
        printer.bold(false);
        printer.customLeftCyrrilicOriented('В т.ч. НДС', s.convert('В т.ч. НДС'), Math.floor(printData.totalPrice * 0.12) + '');
        printer.newLine();
        printer.drawLine();
        if (isFiscal && webkassaData) {
          printer.println(s.convert(`Фискальный признак: ${webkassaData.chequeResponse.Data.CheckNumber}`));
        }
        if (printData.createdDate) {
          printer.println(Buffer.concat([s.convert('Дата: '), Buffer.from(moment(printData.createdDate).format('DD.MM.YYYY, HH:mm:ss'))]));
        } else {
          printer.println(Buffer.concat([s.convert('Дата: '), Buffer.from(moment().format('DD.MM.YYYY, HH:mm:ss'))]));
        }


        if (isFiscal && webkassaData) {
          printer.println(s.convert(`Оператор фискальных данных:`));
          printer.println(s.convert(`AO "Казахтелеком"`));
        }
        printer.drawLine();

        printer.newLine();
        printer.alignCenter();
        if (isFiscal && webkassaData) {
          printer.println(s.convert(`ИНК ${webkassaData.chequeResponse.Data.Cashbox.IdentityNumber}`));
          printer.println(s.convert(`РНК ${webkassaData.chequeResponse.Data.Cashbox.RegistrationNumber}`));
          printer.println(s.convert(`ЗНК ${webkassaData.chequeResponse.Data.Cashbox.UniqueNumber}`));
          printer.newLine();
        }
        printer.println(s.convert('***СПАСИБО ЗА ПОКУПКУ***'));
        printer.println(s.convert('АВТОМАТИЗИРОВАНО С ПОМОЩЬЮ FORTE KASSA'));
        printer.newLine();
        printer.newLine();
        printer.newLine();
        printer.newLine();


        return new Promise((res, err) => {
          printer.execute().then(data => {
            res('Print success.');
          }).catch(error => {
            err(error);
          });
        });

      }
  }

  promiseTimeout(ms, promise) {
    return new Promise((resolve, reject) => {

      // create a timeout to reject promise if not resolved
      const timer = setTimeout(() => {
        reject(new Error('timeout'));
      }, ms);

      promise
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
