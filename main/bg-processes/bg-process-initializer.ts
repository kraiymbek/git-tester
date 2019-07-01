import { initFavouriteListSyncCron, initNomenCategoriesSyncCron, initNomenSyncCron } from './nomenclature-cron';
import { initOrderSyncCron, initTransactionListSyncCron, initTransferSyncCron } from './transaction-cron';

export function initMerchantDataSync(USER_DATA_PATH, DATABASE_PATH) {
  initNomenSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
  initNomenCategoriesSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
  initOrderSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
  initTransferSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
  initTransactionListSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
  initFavouriteListSyncCron(USER_DATA_PATH, DATABASE_PATH).start();
}
