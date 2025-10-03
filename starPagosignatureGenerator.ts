
import crypto from "crypto";

export function generateStarPagoSignature(params: any, appSecret: string): string {
  const parseExtra = (extra: any) => {
    if (!extra || typeof extra !== 'object') return '';
    const keys = Object.keys(extra).sort();
    return keys.map(k => `${k}=${extra[k]}`).join('&');
  }

  // filter out undefined, null or empty string keys
  const topKeys = Object.keys(params).filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '');
  topKeys.sort();

  const paramsString = topKeys.map(k => {
    if (typeof params[k] === 'object') {
      return `${k}=${parseExtra(params[k])}`;
    }
    return `${k}=${params[k]}`;
  }).join('&');

  const stringToSign = `${paramsString}&key=${appSecret}`;

  return crypto.createHash('sha256').update(stringToSign, 'utf8').digest('hex');
}

/// ---------------------- signature for payin testing ------------------------

// const appSecret = "3c7623bacd4c9f1c1ce770f69a31c578";
// interface PayinParams {
//   appId: string;
//   merOrderNo: string;
//   notifyUrl: string;
//   currency: string;
//   amount: string;
//   payMethod: string;
//   extra: {
//     accountName: string;
//     accountNo: string;
//     bankCode: string;
//     email: string;
//     mobile: string;
//   };
//   returnUrl: string;
//   attach: string;
//   sign?: string; // optional
// }

// const params: PayinParams = {
//   appId: "7af017ba03bf0034ae2c3400623e5e23",
//   merOrderNo: "4085_12200315",
//   notifyUrl: "http://bsjugem.cg/ikx",
//   currency: "IDR",
//   amount: "100",
//   payMethod: "ID_QRIS",
//   extra: {
//     accountName: "我步装需",
//     accountNo: "18128457637",
//     bankCode: "QRIS",
//     email: "k.ftnlwfjq@qq.com",
//     mobile: "18128457637"
//   },
//   returnUrl: "http://yrxn.su/hcenw",
//   attach: "sunt"
// };

// // ✅ now safe to assign sign
// params.sign = generateStarPagoSignature(params, appSecret);
// console.log("Final Postman-ready payload:\n", JSON.stringify(params, null, 2));



/// --------------------- signature for callback testing -----------------------
const appSecret = "3c7623bacd4c9f1c1ce770f69a31c578";

interface CallbackParams {
  orderStatus: string;
  orderNo: string;
  merOrderNo: string;
  amount: string;
  realAmount?: string; // optional, ignore for signature
  currency: string;
  attach: string;
  createTime: number;
  updateTime: number;
  message?: string;    // optional, ignore for signature
  sign?: string;
}

// Payload with all fields to send in webhook
const callbackPayload: CallbackParams = {
  orderStatus: "2",
  orderNo: "f947e051-154b-4098-bdf3-11ee1294f43c",
  merOrderNo: "f947e051-154b-4098-bdf3-11ee1294f43c",
  amount: "100",
  realAmount: "100",  // included in POST body but NOT in signature
  currency: "IDR",
  attach: "starpago",
  createTime: Date.now(),
  updateTime: Date.now(),
  message: "",         // included in POST body but NOT in signature
  sign: "",            // will be generated
};

// ✅ Only required fields for signature
const fieldsForSign = {
  orderStatus: callbackPayload.orderStatus,
  orderNo: callbackPayload.orderNo,
  merOrderNo: callbackPayload.merOrderNo,
  amount: callbackPayload.amount,
  currency: callbackPayload.currency,
  attach: callbackPayload.attach,
  createTime: callbackPayload.createTime,
  updateTime: callbackPayload.updateTime,
};

// Generate correct signature
callbackPayload.sign = generateStarPagoSignature(fieldsForSign, appSecret);

console.log("✅ Postman-ready payload:\n", JSON.stringify(callbackPayload, null, 2));
