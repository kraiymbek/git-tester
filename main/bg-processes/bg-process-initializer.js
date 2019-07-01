"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nomenclature_cron_1 = require("./nomenclature-cron");
var transaction_cron_1 = require("./transaction-cron");
function initMerchantDataSync(USER_DATA_PATH, DATABASE_PATH) {
    nomenclature_cron_1.initNomenSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
    nomenclature_cron_1.initNomenCategoriesSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
    transaction_cron_1.initOrderSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
    transaction_cron_1.initTransferSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
    transaction_cron_1.initTransactionListSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
    nomenclature_cron_1.initFavouriteListSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
}
exports.initMerchantDataSync = initMerchantDataSync;
//# sourceMappingURL=bg-process-initializer.js.map