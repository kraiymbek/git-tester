"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PaymentOptions;
(function (PaymentOptions) {
    PaymentOptions["CASH"] = "CASH";
    PaymentOptions["CARD"] = "CARD";
    PaymentOptions["DARWallet"] = "DARWallet";
    PaymentOptions["CREDIT"] = "CREDIT";
    PaymentOptions["INSTALLMENT"] = "INSTALLMENT";
})(PaymentOptions = exports.PaymentOptions || (exports.PaymentOptions = {}));
var PaymentOptionsDict;
(function (PaymentOptionsDict) {
    PaymentOptionsDict["CASH"] = "\u041D\u0430\u043B\u0438\u0447\u043D\u0430\u044F \u043E\u043F\u043B\u0430\u0442\u0430";
    PaymentOptionsDict["CARD"] = "\u041E\u043F\u043B\u0430\u0442\u0430 \u043A\u0430\u0440\u0442\u043E\u0439";
    PaymentOptionsDict["DARWallet"] = "DARWallet";
    PaymentOptionsDict["CREDIT"] = "CREDIT";
    PaymentOptionsDict["INSTALLMENT"] = "INSTALLMENT";
})(PaymentOptionsDict = exports.PaymentOptionsDict || (exports.PaymentOptionsDict = {}));
var TransferTypes;
(function (TransferTypes) {
    TransferTypes["CONSUMER_RETURNS"] = "CONSUMER_RETURNS";
    TransferTypes["SELL"] = "SELL";
    TransferTypes["CASH_OUT"] = "CASH_OUT";
    TransferTypes["CASH_IN"] = "CASH_IN";
    TransferTypes["PAYMENT_OF_EXPENDITURE"] = "PAYMENT_OF_EXPENDITURE";
    TransferTypes["PAYMENT_OF_EXPENSES"] = "PAYMENT_OF_EXPENSES";
    TransferTypes["SEND_TO_KASSA"] = "SEND_TO_KASSA";
    TransferTypes["PAYMENT_TO_SUPPLIER"] = "PAYMENT_TO_SUPPLIER";
    TransferTypes["DEBT"] = "DEBT";
    TransferTypes["OTHER_SOURCES"] = "OTHER_SOURCES";
})(TransferTypes = exports.TransferTypes || (exports.TransferTypes = {}));
var TransferTypesDict;
(function (TransferTypesDict) {
    TransferTypesDict["CONSUMER_RETURNS"] = "\u0412\u043E\u0437\u0432\u0440\u0430\u0442";
    TransferTypesDict["SELL"] = "\u041F\u0440\u043E\u0434\u0430\u0436\u0430";
    TransferTypesDict["CASH_OUT"] = "\u0418\u043D\u043A\u0430\u0441\u0441\u0430\u0446\u0438\u044F";
    TransferTypesDict["CASH_IN"] = "\u0412\u043D\u0435\u0441\u0435\u043D\u0438\u0435";
    TransferTypesDict["PAYMENT_OF_EXPENDITURE"] = "\u041E\u043F\u043B\u0430\u0442\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u043E\u0432 \u043F\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u044E";
    TransferTypesDict["PAYMENT_OF_EXPENSES"] = "\u041D\u0435\u043F\u0440\u0435\u0434\u0432\u0438\u0434\u0435\u043D\u043D\u044B\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B";
    TransferTypesDict["SEND_TO_KASSA"] = "\u041F\u0435\u0440\u0435\u0432\u043E\u0434 \u043D\u0430 \u0434\u0440\u0443\u0433\u0443\u044E \u043A\u0430\u0441\u0441\u0443";
    TransferTypesDict["PAYMENT_TO_SUPPLIER"] = "\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0443";
    TransferTypesDict["DEBT"] = "\u0414\u043E\u043B\u0433";
    TransferTypesDict["OTHER_SOURCES"] = "\u0414\u0440\u0443\u0433\u0438\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0438";
})(TransferTypesDict = exports.TransferTypesDict || (exports.TransferTypesDict = {}));
var WorkShiftStatuses;
(function (WorkShiftStatuses) {
    WorkShiftStatuses["OPEN"] = "OPEN";
    WorkShiftStatuses["CLOSED"] = "CLOSED";
})(WorkShiftStatuses = exports.WorkShiftStatuses || (exports.WorkShiftStatuses = {}));
//# sourceMappingURL=transfers.js.map