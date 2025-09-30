export interface Merchant {
  username: string;
  email?: string;
  password?: string;
  phone_number: string;
  company_name: string;
  company_url: string;
  city: string;
  payment_volume: string;
  commission: number;
  merchantId: number;
  commissionGST: number;
  commissionWithHoldingTax: number;
  disbursementRate: number;
  disbursementGST: number;
  disbursementWithHoldingTax: number;
  settlementDuration: number;
  payinxMerchantId: number;
  webhook_url: string;
  uid?: string;
  EasyPaisaDisburseAccountId?: number | null;
  depositMethod: "PAYINX";
  withdrawalMethod: "PAYINX";
  encrypted: string;
  callback_mode: "SINGLE" | "DOUBLE";
  payout_callback: string;
  easypaisaLimit: number;
  swichLimit: number;
  commissionMode: "SINGLE" | "DOUBLE";
  easypaisaRate: number;
  wooMerchantId: number;
  cardRate: number;
  depositInquiryMethod: "DATABASE" | "WALLET";
  withdrawalInquiryMethod: "DATABASE" | "WALLET";
}

export interface IjazzCashConfigParams {
  merchantId: string;
}
export interface IEasyPaisaPayload {
  storeId: string;
  username: string;
  credentials: string;
  metadata: any;
}
export interface ISwichPayload {
  clientId: string;
  clientSecret: string;
}

export interface IDisbursement {
  id?: string | number | null;
  MSISDN: string;
  clientId: string;
  clientSecret: string;
  xChannel: string;
  pin: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface IZindigiPayload {
  clientId: string;
  clientSecret: string;
  organizationId: string;
}