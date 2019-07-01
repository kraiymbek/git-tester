import { NomenEventHandler } from './nomen-event-handler';
import { CredentialsEventHandler } from './credentials-event-handler';
import { FileStorage } from '../utils/in-memory-store/filestorage';
import { TransactionsEvents } from './transactions-events';
import { ClientTriggerEvents } from './client-trigger-events';
import { PrinterEvents } from './printer-events';

// todo: refactor - move client ipc names to enum
// APP PATH - app main directory path
// USER_DATA_PATH - app local data folder
// DATABASE_PATH - USER_DATA_PATH + databases folder
export function initializeEventHandlers(APP_DIRECTORY_PATH, USER_DATA_PATH, DATABASE_PATH) {
  const nomenListener = new NomenEventHandler(DATABASE_PATH);
  nomenListener.clientIPCListener();

  // credentials update listener
  const credentialsListener = new CredentialsEventHandler(new FileStorage(USER_DATA_PATH));
  credentialsListener.initListener();

  // transactions update listener
  const transactionListener = new TransactionsEvents(USER_DATA_PATH, DATABASE_PATH);
  transactionListener.listenTransactionChange();

  const clientTriggerListener = new ClientTriggerEvents(APP_DIRECTORY_PATH, USER_DATA_PATH, DATABASE_PATH);
  clientTriggerListener.listenClientTrigger();

  const printerEventListener = new PrinterEvents(USER_DATA_PATH);
  printerEventListener.listenPrinterChange();
  printerEventListener.listenPrinterData();
}
