
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
//   merOrderNo: "4085_12200315", //order_id
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



// // /// --------------------- signature for callback testing -----------------------
// // const appSecret = "3c7623bacd4c9f1c1ce770f69a31c578";

// // interface CallbackParams {
// //   orderStatus: string;
// //   orderNo: string;
// //   merOrderNo: string;
// //   amount: string;
// //   realAmount?: string; // optional, ignore for signature
// //   currency: string;
// //   attach: string;
// //   createTime: number;
// //   updateTime: number;
// //   message?: string;    // optional, ignore for signature
// //   sign?: string;
// // }

// // // Payload with all fields to send in webhook
// // const callbackPayload: CallbackParams = {
// //   orderStatus: "2",
// //   orderNo: "f947e051-154b-4098-bdf3-11ee1294f43c",
// //   merOrderNo: "f947e051-154b-4098-bdf3-11ee1294f43c",
// //   amount: "100",
// //   realAmount: "100",  // included in POST body but NOT in signature
// //   currency: "IDR",
// //   attach: "starpago",
// //   createTime: Date.now(),
// //   updateTime: Date.now(),
// //   message: "",         // included in POST body but NOT in signature
// //   sign: "",            // will be generated
// // };

// // // ✅ Only required fields for signature
// // const fieldsForSign = {
// //   orderStatus: callbackPayload.orderStatus,
// //   orderNo: callbackPayload.orderNo,
// //   merOrderNo: callbackPayload.merOrderNo,
// //   amount: callbackPayload.amount,
// //   currency: callbackPayload.currency,
// //   attach: callbackPayload.attach,
// //   createTime: callbackPayload.createTime,
// //   updateTime: callbackPayload.updateTime,
// // };

// // // Generate correct signature
// // callbackPayload.sign = generateStarPagoSignature(fieldsForSign, appSecret);

// // console.log("✅ Postman-ready payload:\n", JSON.stringify(callbackPayload, null, 2));


/// ---------------------- signature for payout testing ------------------------


// const appSecret = "3c7623bacd4c9f1c1ce770f69a31c578"; // your actual secret key

// interface PayoutParams {
//   appId: string;
//   merOrderNo: string;
//   currency: string;
//   amount: string;
//   notifyUrl: string;
//   payMethod: string;
//   extra: {
//     bankCode: string;
//     accountNo: string;
//     accountName: string;
//     email: string;
//     mobile: string;
//   };
//   attach?: string;
//   sign?: string;
// }

// const payoutParams: PayoutParams = {
//   appId: "7af017ba03bf0034ae2c3400623e5e23",
//   merOrderNo: "unique-payout-001",
//   currency: "IDR",
//   amount: "50000",
//   notifyUrl: "http://yourserver.com/payout-callback",
//   payMethod: "ID_VA",
//   extra: {
//     bankCode: "BCA",             // sample bank code
//     accountNo: "1234567890",     // receiver account
//     accountName: "John Doe",
//     email: "john@example.com",
//     mobile: "081234567890"
//   },
//   attach: "optional-note"
// };

// // ✅ Generate Signature
// payoutParams.sign = generateStarPagoSignature(payoutParams, appSecret);

// console.log("✅ Final Postman-ready payout payload:\n", JSON.stringify(payoutParams, null, 2))

/// ---------------------- signature for payout webhook testing ------------------------

const appSecret = "3c7623bacd4c9f1c1ce770f69a31c578"; // your StarPago secret key

interface PayoutWebhookParams {
  orderStatus: string;    // 订单状态
  orderNo: string;        // 交易订单号
  merOrderNo: string;     // 商户订单号
  amount: string;         // 订单金额
  currency: string;       // 金额币种
  attach: string;         // 附加信息
  receiptUrl?: string;    // 凭证信息 (optional)
  createTime: number;     // 创建时间
  updateTime: number;     // 更新时间
  message?: string;       // 描述信息 (optional)
  sign?: string;          // 签名
}

// 🔹 Create mock payload (for simulation)
const payoutWebhookPayload: PayoutWebhookParams = {
  orderStatus: "2",  // 2 or 3 = success
  orderNo: "DEV-2025100611553605znb", //system order id
  merOrderNo: "unique-order-005",
  amount: "10000",
  currency: "IDR",
  attach: "starpago",
  receiptUrl: "https://starpago.com/receipt/sample.jpg", // optional
  createTime: Date.now(),
  updateTime: Date.now(),
  message: "Payout completed successfully",
  sign: "",
};

// ✅ Only include fields required for signing
const payoutWebhookFieldsForSign = {
  orderStatus: payoutWebhookPayload.orderStatus,
  orderNo: payoutWebhookPayload.orderNo,
  merOrderNo: payoutWebhookPayload.merOrderNo,
  amount: payoutWebhookPayload.amount,
  currency: payoutWebhookPayload.currency,
  attach: payoutWebhookPayload.attach,
  createTime: payoutWebhookPayload.createTime,
  updateTime: payoutWebhookPayload.updateTime,
};

// ✅ Generate signature
payoutWebhookPayload.sign = generateStarPagoSignature(payoutWebhookFieldsForSign, appSecret);

// ✅ Print final Postman-ready webhook JSON
console.log("✅ Final StarPago Payout Webhook Payload:\n", JSON.stringify(payoutWebhookPayload, null, 2));
