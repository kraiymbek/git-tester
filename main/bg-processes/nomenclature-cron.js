"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cron = require("cron");
var cronJob = cron.CronJob;
var nomenclature_sync_1 = require("./nomenclature-sync");
var categories_sync_1 = require("./categories-sync");
var app_meta_1 = require("../app-meta");
var favourite_list_sync_1 = require("./favourite-list-sync");
function initNomenSyncCron(storePath, ldbPath) {
    console.log('Nomenclature list sync initialized. ');
    var nomenSync;
    return new cronJob(app_meta_1.NOMENS_SYNC_CRON_SCHEDULE_PATTERN, function () {
        console.log('nomen list sync started at ' + new Date());
        nomenSync = nomenclature_sync_1.NomenclatureSync.getInstace(storePath, ldbPath);
        nomenSync.start();
    });
}
exports.initNomenSyncCron = initNomenSyncCron;
function initNomenCategoriesSyncCron(storePath, ldbPath) {
    var categoriesSync;
    return new cronJob(app_meta_1.CATEGORIES_SYNC_CRON_SCHEDULE_PATTERN, function () {
        categoriesSync = new categories_sync_1.CategoriesSync(storePath, ldbPath);
        categoriesSync.start();
    });
}
exports.initNomenCategoriesSyncCron = initNomenCategoriesSyncCron;
function initFavouriteListSyncCron(storePath, ldbPath) {
    var favouriteList;
    return new cronJob(app_meta_1.FAVOURITE_SYNC_CRON_SCHEDULE_PATTERN, function () {
        favouriteList = new favourite_list_sync_1.FavouriteListSync(storePath, ldbPath);
        favouriteList.start();
    });
}
exports.initFavouriteListSyncCron = initFavouriteListSyncCron;
//# sourceMappingURL=nomenclature-cron.js.map