export interface IOrder {
  _rev: string;
  _id: any;
  createTime?: number;
  id?: string;
  invoiceRef?: string;
  isNeedRegisterWebKassa: boolean;
  isNeedSync?: boolean;
  localId: string;
  merchantId: string;
  merchantTitle: string;
  orderItems: OrderItem[];
  ownType: string;
  owner: string;
  paidDate: string;
  payTitle: OrderPayType;
  payTypes: OrderPayType;
  price: number;
  receivedSum: number;
  terminalId: string;
  uid: string;
  isSynced: boolean;
  transferSynced: boolean;
}

export interface OrderSyncRequest {
  offlineOrders: IOrder[];
}

export interface OrdersSyncResponse {
  status: number;
  order_states: OrderSaveState[];
}

export interface OrderSaveState {
  uid: string; // OrderID,
  invoice_ref: string;
  created: boolean;
  message?: string;
}

export enum OrderPayType {
  CASH = 'CASH',
  CARD = 'CARD',
}

export enum OrderOwnerType {
  MERCHANT = 'merchant',
}

export interface OrderSyncResponse {
  order_states: {
    uid: string;
    invoice_ref: string;
    created: boolean;
  };
}

export interface PrintData {
  items: OrderItem[];
  receivedSum: number;
  totalPrice: number;
  isToPrint: boolean;
  merchantInfo?: Partner;
  printerName?: string;
  cashierName: string;
  payType: string;
  createdDate?: string;
  isOnline?: boolean;
}

export interface OrderItem {
  amount: number;
  name: string;
  price: number;
  stock_id?: string[];
  uid: string;
  unit: string;
}

export interface Partner {
  bankDetail: BankDetail;
  legalDetail: LegalDetail;
  managers: Managers;
  merchantMainDetail?: MerchantMainDetail;
}

export interface BankDetail {
  vatLaunchDate?: Date;
  vatTaxPayer?: boolean;
  bankName?: string;
  bankAccountNum?: string;
  iban?: string;
  bik?: string;
  kbe?: string;
  okpo?: string;
  vatSerialNum?: string;
  vatNum?: string;
}

export interface LegalDetail {
  businessType?: string;
  legalId?: string;
  directorName?: string;
  directorPosition?: string;
  legalIdCert?: string;
  businessFormType?: 'ONLINE' | 'OFFLINE' | 'BOTH';
  charge?: number;
  agency?: string;
  recordNum?: number;
  recordDate?: Date;
}

export interface Managers {
  contractNum?: string;
  signedDate?: Date;
  launchDate?: Date;
  darManagerName?: string;
  darManagerPhoneNum?: string;
  darManagerEmail?: string;
  contactPhoneNum?: string;
  managersPhoneNum?: string;
  percentRate?: number;
  returnRate?: number;
  freqOfSettlement?: number;
}

export interface MerchantMainDetail {
  brand?: string;
  code?: string;
  telephone?: string;
  email?: string;
  state?: string;
  legalName?: string;
  legalAddress?: Address;
  address?: Address;
  bizCategories?: string[];
  shortCategories?: any[];
  description?: string;
  numOfItemCats: number;
  numOfOutlets: number;
  id?: string;
  oldIdCode?: string;
  merchantId?: string;
  owner?: string;
  logoToken?: string;
  surl?: string;
  smap?: string;
  avatarToken?: string;
  bannerToken?: string;
  aboutUs?: string;
  cityId?: string;
  website?: string;
  contacts?: Contacts[];
  regionId?: string;
  aggregates?: string[];
  isAggregate?: boolean;
  isVerified?: boolean;
  createdDate?: Date;
  updatedDate?: Date;
  removedDate?: Date;
}

export interface Contacts {
  workPhoneNum?: string;
  cellPhoneNum?: string;
  email?: string;
  centersPhoneNum?: string;
  storageAddress?: Address;
  isMain: boolean;
}

export interface Address {
  regionId?: string;
  street?: string;
  streetNum?: string;
  aptNum?: string;
}

export interface Webkassa {
  webKassaChequeForm: {
    jsonClass: string;
    cashboxUniqueNumber: string;
    operationType: number;
    positions: [{
      jsonClass: string;
      count: number;
      price: number;
      tax: number;
      taxType: number;
      positionName: string;
      positionCode: string;
      discount: number;
      markup: number;
      isStrono: boolean;
      markupDeleted: boolean;
      discountDeleted: boolean;
    }];
    payments: [{
      jsonClass: string;
      sum: number;
      paymentType: number;
    }];
    change: number;
    roundType: number;
    externalChequeNumber: string;
  };
  chequeResponse: {
    jsonClass: string;
    Data: {
      jsonClass: string;
      CheckNumber: string;
      DateTime: string;
      OfflineMode: boolean;
      CashboxOfflineMode: boolean;
      Cashbox: {
        jsonClass: string;
        UniqueNumber: string;
        RegistrationNumber: string;
        IdentityNumber: string;
      };
      CheckOrderNumber: number;
      ShiftNumber: number;
      EmployeeName: string;
    }
  };
}


