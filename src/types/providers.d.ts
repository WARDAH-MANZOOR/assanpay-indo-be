export interface DisbursementPayload {
  amount: number;
  phone: string;
  order_id: string;
}

export interface UpdateDisbursementPayload {
  merchantAmount: number;
  commission: number;
  gst: number;
  withholdingTax: number;
  account: string;
  order_id: string;
  merchant_custom_order_id: string;
  system_order_id: string;
  cnic: string;
  bankName: string;
  to_provider: string;
}

export interface IEasyLoginPayload {
  ResponseCode: string;
  ResponseMessage: string;
  User: string;
  Timestamp: string;
}
