import { app, ipcMain } from 'electron';

export class EventHandlerBase {
  ipcMain: typeof ipcMain;
  app: typeof app;

  constructor() {
    this.ipcMain = ipcMain;
    this.app = app;
  }
}
