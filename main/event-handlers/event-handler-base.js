"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var EventHandlerBase = /** @class */ (function () {
    function EventHandlerBase() {
        this.ipcMain = electron_1.ipcMain;
        this.app = electron_1.app;
    }
    return EventHandlerBase;
}());
exports.EventHandlerBase = EventHandlerBase;
//# sourceMappingURL=event-handler-base.js.map