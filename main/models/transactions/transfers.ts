export interface Transaction {
  _id?: any;
  _rev: string;
  id: string;
  amount?: number;
  receivedSum?: number;
  cashierId?: string;
  comment?: string;
  currency?: string;
  currentBalance?: number;
  invoice?: Invoice;
  invoiceId?: string;
  kassaCode?: string;
  kassaId: string;
  merchantId: string;
  profileId?: string;
  storeId: string;
  terminalId?: string;
  transferType: TransferTypes;
  workShiftId?: string; // instance of Workshift interface
  checkFiscal?: boolean;
  orderRef?: string;
  from?: string;
  to?: string;
  invoice_ref?: string;
  recordDate?: Date;
  createdDate?: string;
  isSynced?: boolean;
  orderSynced?: boolean;
}

export interface Invoice {
  cheque?: any[];
  id?: string;
  invoiceState?: string;
  invoiceType?: string;
  items?: InvoiceItem[];
  paymentOption?: PaymentOption;
  subTotal?: number;
}

export interface TransactionSaveResp {
  status: number;
}

export interface PaymentOption {
  change: number;
  id: string;
  paydAmount: number;
  paymentType: PaymentOptions;
}

export enum PaymentOptions {
  CASH = 'CASH',
  CARD = 'CARD',
  DARWallet = 'DARWallet',
  CREDIT = 'CREDIT',
  INSTALLMENT = 'INSTALLMENT',
}

export enum PaymentOptionsDict {
  CASH = 'Наличная оплата',
  CARD = 'Оплата картой',
  DARWallet = 'DARWallet',
  CREDIT = 'CREDIT',
  INSTALLMENT = 'INSTALLMENT',
}

export interface InvoiceItem {
  code: string;
  cost: number;
  primeCost: number;
  desc: string;
  quantity: number;
}

export enum TransferTypes {
  CONSUMER_RETURNS = 'CONSUMER_RETURNS',
  SELL = 'SELL',
  CASH_OUT = 'CASH_OUT',
  CASH_IN = 'CASH_IN',
  PAYMENT_OF_EXPENDITURE = 'PAYMENT_OF_EXPENDITURE',
  PAYMENT_OF_EXPENSES = 'PAYMENT_OF_EXPENSES',
  SEND_TO_KASSA = 'SEND_TO_KASSA',
  PAYMENT_TO_SUPPLIER = 'PAYMENT_TO_SUPPLIER',
  DEBT = 'DEBT',
  OTHER_SOURCES = 'OTHER_SOURCES',
}

export enum TransferTypesDict {
  CONSUMER_RETURNS = 'Возврат',
  SELL = 'Продажа',
  CASH_OUT = 'Инкассация',
  CASH_IN = 'Внесение',
  PAYMENT_OF_EXPENDITURE = 'Оплата расходов по содержанию',
  PAYMENT_OF_EXPENSES = 'Непредвиденные расходы',
  SEND_TO_KASSA = 'Перевод на другую кассу',
  PAYMENT_TO_SUPPLIER = 'Оплата поставщику',
  DEBT = 'Долг',
  OTHER_SOURCES = 'Другие источники',
}

export interface TransactionsReportSummary {
  totalSales: number;
  totalSalesAmount: number;
  averageAmount: number;
}

export interface  TotalTransaction {
  data: Transaction[];
  totalAmount: number;
  status?: number;
}

export interface WorkShift {
  id: string;
  balanceAtClose: number;
  balanceAtOpen: number;
  closedDate: string;
  openDate: string;
  kassaId: string;
  shiftNumber: string;
  status: WorkShiftStatuses;
}

export enum WorkShiftStatuses {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}
