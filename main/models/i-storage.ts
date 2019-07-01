import { Partner } from './transactions/orders';

export interface AuthCredentials {
  access_token: string;
  expires_in: number;
  merchantId: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface MerchantCredentials {
  merchantInfo?: Partner;
  authCredentials?: AuthCredentials;
  outletData?: any;
  environmentData?: EnvironmentData;
  currentCashbox?: any;
  currentWorkshift?: string;
  currentUser?: string; // store current users merchant id
}

export interface EnvironmentData {
  stock: {
    host: string;
    version: string;
  };
  outlet: {
    host: string;
    version: string;
  };
  kassaApi: {
    host: string;
    version: string;
  };
}
