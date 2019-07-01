"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nomen_event_handler_1 = require("./nomen-event-handler");
var credentials_event_handler_1 = require("./credentials-event-handler");
var filestorage_1 = require("../utils/in-memory-store/filestorage");
var transactions_events_1 = require("./transactions-events");
var client_trigger_events_1 = require("./client-trigger-events");
var printer_events_1 = require("./printer-events");
// todo: refactor - move client ipc names to enum
// APP PATH - app main directory path
// USER_DATA_PATH - app local data folder
// DATABASE_PATH - USER_DATA_PATH + databases folder
function initializeEventHandlers(APP_DIRECTORY_PATH, USER_DATA_PATH, DATABASE_PATH) {
    var nomenListener = new nomen_event_handler_1.NomenEventHandler(DATABASE_PATH);
    nomenListener.clientIPCListener();
    // credentials update listener
    var credentialsListener = new credentials_event_handler_1.CredentialsEventHandler(new filestorage_1.FileStorage(USER_DATA_PATH));
    credentialsListener.initListener();
    // transactions update listener
    var transactionListener = new transactions_events_1.TransactionsEvents(USER_DATA_PATH, DATABASE_PATH);
    transactionListener.listenTransactionChange();
    var clientTriggerListener = new client_trigger_events_1.ClientTriggerEvents(APP_DIRECTORY_PATH, USER_DATA_PATH, DATABASE_PATH);
    clientTriggerListener.listenClientTrigger();
    var printerEventListener = new printer_events_1.PrinterEvents(USER_DATA_PATH);
    printerEventListener.listenPrinterChange();
    printerEventListener.listenPrinterData();
}
exports.initializeEventHandlers = initializeEventHandlers;
//# sourceMappingURL=index.js.map