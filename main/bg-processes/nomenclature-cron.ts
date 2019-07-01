import * as cron from 'cron';
const cronJob = cron.CronJob;

import { NomenclatureSync } from './nomenclature-sync';
import { CategoriesSync } from './categories-sync';
import {
  CATEGORIES_SYNC_CRON_SCHEDULE_PATTERN,
  FAVOURITE_SYNC_CRON_SCHEDULE_PATTERN,
  NOMENS_SYNC_CRON_SCHEDULE_PATTERN
} from '../app-meta';
import { FavouriteListSync } from './favourite-list-sync';


export function initNomenSyncCron(storePath: string, ldbPath: string): cron.CronJob {
  console.log('Nomenclature list sync initialized. ');
  let nomenSync: NomenclatureSync;
  return new cronJob(NOMENS_SYNC_CRON_SCHEDULE_PATTERN, () => {
    console.log('nomen list sync started at ' + new Date());
    nomenSync = NomenclatureSync.getInstace(storePath, ldbPath);
    nomenSync.start();
  });
}

export function initNomenCategoriesSyncCron(storePath: string, ldbPath: string): cron.CronJob {
  let categoriesSync: CategoriesSync;
  return new cronJob(CATEGORIES_SYNC_CRON_SCHEDULE_PATTERN, () => {
    categoriesSync = new CategoriesSync(storePath, ldbPath);
    categoriesSync.start();
  });
}

export function initFavouriteListSyncCron(storePath: string, ldbPath: string): cron.CronJob {
  let favouriteList: FavouriteListSync;
  return new cronJob(FAVOURITE_SYNC_CRON_SCHEDULE_PATTERN, () => {
    favouriteList = new FavouriteListSync(storePath, ldbPath);
    favouriteList.start();
  });
}
