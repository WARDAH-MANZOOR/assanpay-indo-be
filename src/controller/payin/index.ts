import axios from "axios";
import { Request, RequestHandler, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import prisma from "../../lib/prisma.js"
import { Prisma } from "@prisma/client";
import dalalmart from "./dalalmart.js";
import { PROVIDERS } from "../../constants/providers.js";
import { ShurjoPayPayment } from "./shurjoPay.js";
import { BkashSetupPayment } from "./bkashSetup.js";
import { StarPagoPayin } from "./starPago.js";
import { LauncxPayment } from "./launcx.js";

const generateUniqueReference = (orderId: string) => {
  const uniqueId = uuidv4().replace(/-/g, '');
  return `${orderId}-${uniqueId}`;
};

const getHeaders = (includePublicKey = false) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-SECRET-KEY': process.env.PAYINX_SECRET_KEY || '',
  };

  if (includePublicKey) {
    headers['Public-Key'] = process.env.PAYINX_PUBLIC_KEY || '';
    headers['Secret-Key'] = process.env.PAYINX_SECRET_KEY || '';
  }

  return headers;
};

export const createTransactionId = () => {
  const currentTime = Date.now();
  const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
  const fractionalMilliseconds = Math.floor(
    (currentTime - Math.floor(currentTime)) * 1000
  );

  const txnRefNo = `T${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
  return txnRefNo;
}

export const createTxn = async (obj: any) => {
  let settledAmount = obj.amount * (1 - obj.commission);
  let data: { transaction_id?: string; merchant_transaction_id?: string; } = {}
  // if (params.order_id) {
  data["merchant_transaction_id"] = obj.order_id;
  // }
  // else {
  // data["merchant_transaction_id"] = id;
  // }
  data["transaction_id"] = obj.transaction_id;
  return await prisma?.$transaction(async (tx: Prisma.TransactionClient) => {
    try {
      return await tx.transaction.create({
        data: {
          // order_id: obj.order_id,
          ...data,
          date_time: new Date(),
          original_amount: obj.amount,
          type: obj.type,
          status: obj.status,
          merchant_id: obj.merchant_id,
          settled_amount: settledAmount,
          balance: settledAmount,
          providerDetails: obj.providerDetails,
          response_message: obj.response_message
        },
      });
    }
    catch (err) {
      console.log(err)
      throw new Error("Transaction not Created")
    }
  });
};

const addWeekdays = (date: Date, days: number) => {
  // Get the current date
  const date2 = new Date(date);

  // Define the Pakistan timezone
  const timeZone = 'Asia/Karachi';

  // Convert the date to the Pakistan timezone
  const zonedDate = toZonedTime(date2, timeZone);
  let addedDays = 0;

  while (addedDays < days) {
    zonedDate.setDate(zonedDate.getDate() + 1);

    // Skip weekends
    const dayOfWeek = zonedDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  // Set a random time before 4:00 pm (16:00)
  zonedDate.setHours(0, 0, 0, 0);

  return zonedDate;
};

export const updateTxn = async (transaction_id: string, obj: any, duration: number) => {
  return await prisma?.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingTransaction = await tx.transaction.findUnique({
      where: { transaction_id: transaction_id }
    });

    if (existingTransaction) {
      await tx.transaction.update({
        where: { transaction_id: transaction_id },
        data: {
          ...obj
        },
      });
    } else {
      console.error("Transaction not found for updating:", transaction_id);
    }

    const provider = await tx.provider.upsert({
      where: {
        name_txn_type_version: {
          name: "EasyPaisa",
          txn_type: "MA",
          version: "",
        },
      },
      update: {},
      create: {
        name: "EasyPaisa",
        txn_type: "MA",
        version: "",
      },
    });
    if (obj.status == "completed") {
      const scheduledAt = addWeekdays(new Date(), duration);  // Call the function to get the next 2 weekdays
      console.log(scheduledAt)
      let scheduledTask = await tx.scheduledTask.create({
        data: {
          transactionId: transaction_id,
          status: 'pending',
          scheduledAt: scheduledAt,  // Assign the calculated weekday date
          executedAt: null,  // Assume executedAt is null when scheduling
        }
      });
    }
  }, {
    timeout: 60000,
    maxWait: 60000
  });
};

const autoCashinController = async (req: Request, res: Response) => {
  try {
    console.log('=== AUTO CASHIN CONTROLLER START ===');
    console.log('Request Payload:', JSON.stringify(req.body, null, 2));
    console.log('Request Params:', JSON.stringify(req.params, null, 2));
    
    const { merchantId } = req.params;
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId
      },
      include: {
        commissions: true
      }
    })

    if (!merchant) {
      console.log('❌ Merchant Not Found for ID:', merchantId);
      return res.status(400).json({ error: 'Merchant Not Found' });
    }
    let {
      amount, order_id, phone, redirect_url
    } = req.body;

    if (!amount || !phone || !redirect_url) {
      console.log('❌ Missing required fields:', { amount, phone, redirect_url });
      return res.status(400).json({ error: 'amount, phone, type and redirect_url are required' });
    }
    let id = createTransactionId()
    order_id = order_id || id;
    const reference = generateUniqueReference(order_id);

    const payload: Record<string, any> = {
      currency: "BDT",
      amount,
      reference: order_id,
      callback_url: process.env.CALLBACK_URL,
      redirect_url: redirect_url || process.env.REDIRECT_URL,
      customer_phone: phone,
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    console.log('📤 PayinX API Payload:', JSON.stringify(payload, null, 2));

    const txn = await createTxn({
      order_id: order_id,
      transaction_id: id,
      amount: amount,
      status: "pending",
      type: "wallet",
      merchant_id: merchant?.merchant_id,
      commission: merchant?.commissions[0]?.commissionRate,
      settlementDuration: merchant?.commissions[0]?.settlementDuration,
      providerDetails: {
        id: 1,
        name: "BDT",
        msisdn: phone
      },
    })
    
    console.log('💾 Transaction Created:', JSON.stringify(txn, null, 2));
    
    const response = await axios.post(
      `${process.env.PAYINX_BASE_URL}/api/v1/create_payment`,
      payload,
      { headers: getHeaders() }
    );

    console.log('📥 PayinX API Response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 200 || response.data.status === 201) {
      console.log('✅ Auto Cashin Success');
      console.log('=== AUTO CASHIN CONTROLLER END ===');
      return res.status(200).json({
        status: 'success',
        data: response.data,
        message: 'Payment initiated successfully',
      });
    } else {
      console.log('❌ Auto Cashin Failed:', response.data.message);
      await updateTxn(
        txn?.transaction_id as string,
        {
          response_message: response.data.message,
          status: "failed",
        },
        1
      )
      console.log('=== AUTO CASHIN CONTROLLER END ===');
      return res.status(response.data.status).json({
        status: 'error',
        message: 'Payment initiation failed',
        data: response.data,
      });
    }
  } catch (error: any) {
    console.error('❌ Error initiating auto cash-in:', error.message);
    console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
    console.log('=== AUTO CASHIN CONTROLLER END ===');
    return res.status(500).json({
      status: 'error',
      message: error.message,
      data: error.response?.data,
    });
  }
}

const payin = async (req: Request, res: Response) => {
  console.log('=== PAYIN CONTROLLER START ===');
  console.log('Request Payload:', JSON.stringify(req.body, null, 2));
  console.log('Request Params:', JSON.stringify(req.params, null, 2));
  
  const { merchantId } = req.params;
  const body = req.body;

  const merchant = await prisma.merchant.findFirst({
    where: {
      uid: merchantId
    },
    select: {
      depositMethod: true,
      bkashDepositMethod: true,
      nagadDepositMethod: true
    }
  })

  if (!merchant) {
    console.log('❌ Merchant Not Found for ID:', merchantId);
    return res.status(400).json({ error: 'Merchant Not Found' });
  }

  let depositMethod;
  if (body.payment_method == "bkash") {
    depositMethod = merchant?.bkashDepositMethod;
  }
  else {
    depositMethod = merchant?.nagadDepositMethod;
  }
  console.log('🔧 Selected Deposit Method:', depositMethod);
  
  if (depositMethod == "PAYINX") {
    console.log('🚀 Routing to PAYINX');
    await directPayin(req, res);
  }
  else if ((depositMethod as string) == "SHURJOPAY") {
    console.log('🚀 Routing to SHURJOPAY');
    await ShurjoPayPayment(req, res);
  }
  else if ((depositMethod as string) == "BKASHSETUP") {
    console.log('🚀 Routing to BKASHSETUP (bKash)');
    await BkashSetupPayment(req, res);
  }
  else if ((depositMethod as string) == "DALALMART"){
    console.log('🚀 Routing to DALALMART');
    await dalalmart.dalalMartPayin(req,res)
  }
  else {
    return res.status(500).json({ status: "error", message: "Account Not Assigned" })
  }
  console.log('=== PAYIN CONTROLLER END ===');
}

const directPayin = async (req: Request, res: Response) => {
  try {
    console.log('=== DIRECT PAYIN CONTROLLER START ===');
    console.log('Request Payload:', JSON.stringify(req.body, null, 2));
    console.log('Request Params:', JSON.stringify(req.params, null, 2));
    
    const { merchantId } = req.params;
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId
      },
      include: {
        commissions: true
      }
    })

    if (!merchant) {
      console.log('❌ Merchant Not Found for ID:', merchantId);
      return res.status(400).json({ error: 'Merchant Not Found' });
    }
    let {
      amount, order_id, phone, redirect_url, payment_method, callback_url
    } = req.body;

    if (!amount || !payment_method) {
      console.log('❌ Missing required fields:', { amount, payment_method });
      return res.status(400).json({ error: 'currency, amount, orderId, and payment_method are required' });
    }

    if (!['bkash', 'nagad'].includes(payment_method)) {
      console.log('❌ Invalid payment method:', payment_method);
      return res.status(400).json({ error: 'payment_method must be bkash or nagad' });
    }

    let id = createTransactionId()
    order_id = order_id || id;
    let reference;
    reference = order_id;

    const payload: Record<string, any> = {
      currency: "BDT", amount: +amount, reference,
      callback_url: callback_url || process.env.CALLBACK_URL,
      redirect_url: redirect_url || process.env.REDIRECT_URL,
      payment_method, customer_name: "", customer_email: "", customer_phone: "",
      customer_address: "",
      product: "",
      note: ""
    };

    console.log("📤 PayinX Direct Payment Payload:", JSON.stringify(payload, null, 2));
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const txn = await createTxn({
      order_id: order_id,
      transaction_id: id,
      amount: amount,
      status: "pending",
      type: "wallet",
      merchant_id: merchant?.merchant_id,
      commission: merchant?.commissions[0]?.commissionRate,
      settlementDuration: merchant?.commissions[0]?.settlementDuration,
      providerDetails: {
        id: 1,
        name: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
        msisdn: phone
      },
    })

    console.log('💾 Transaction Created:', JSON.stringify(txn, null, 2));

    const response = await axios.post(
      `${process.env.PAYINX_BASE_URL}/api/v1/create_direct_payment`,
      payload,
      { headers: getHeaders() }
    );

    console.log('📥 PayinX Direct Payment Response:', JSON.stringify(response.data, null, 2));

      
    if (response.data.status == "Pending") {
      console.log('✅ Direct Payin Success');
      console.log('=== DIRECT PAYIN CONTROLLER END ===');
      return res.status(200).json({ status: 'success', data: response.data, message: 'Direct payment initiated successfully' });
    } else {
      console.log('❌ Direct Payin Failed:', response.data.message);
      await updateTxn(
        txn?.transaction_id as string,
        {
          response_message: response.data.message,
          status: "failed",
        },
        1
      )
      console.log('=== DIRECT PAYIN CONTROLLER END ===');
      return res.status(response.data.status).json({ status: 'error', message: 'Direct payment initiation failed', data: response.data });
    }
  } catch (error: any) {
    console.error('❌ Error initiating direct cash-in:', error.message);
    console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
    console.log('=== DIRECT PAYIN CONTROLLER END ===');
    return res.status(500).json({ status: 'error', message: error.message, data: error.response?.data });
  }
}

export const IndoPayin: RequestHandler = async (req: Request, res: Response) => {
  const { merchantId } = req.params;
  const { payMethod } = req.body;

  console.log("Indonesia Payin Request:", { merchantId, payMethod });

  const merchant = await prisma.merchant.findFirst({
    where: { uid: merchantId },
    select: {
      depositMethod: true,
      qrisDepositMethod: true,
      ovoDepositMethod: true,
      danaDepositMethod: true,
      gopayDepositMethod: true,
      linkajaDepositMethod: true,
      shopeepayDepositMethod: true,
      vaDepositMethod: true,
    },
  });

  if (!merchant) {
    res.status(400).json({ error: "Merchant not found" });
    return
  }

  // 🔹 Pick deposit method
  let depositMethod: string | null | undefined;

  switch ((payMethod || "").toLowerCase()) {
    case PROVIDERS.QRIS:
      depositMethod = merchant.qrisDepositMethod;
      break;
    case PROVIDERS.OVO:
      depositMethod = merchant.ovoDepositMethod;
      break;
    case PROVIDERS.DANA:
      depositMethod = merchant.danaDepositMethod;
      break;
    case PROVIDERS.GOPAY:
      depositMethod = merchant.gopayDepositMethod;
      break;
    case PROVIDERS.LINKAJA:
      depositMethod = merchant.linkajaDepositMethod;
      break;
    case PROVIDERS.SHOPEEPAY:
      depositMethod = merchant.shopeepayDepositMethod;
      break;
    case PROVIDERS.VA:
      depositMethod = merchant.vaDepositMethod;
      break;
    default:
      depositMethod = merchant.depositMethod; // fallback
      break;
  }

  if (!depositMethod) {
    res.status(500).json({ error: "No deposit method configured for this wallet" });
    return
  }

    const provider = depositMethod.toLowerCase();

// Map aliases
const providerAlias: Record<string, string> = {
  payinx: PROVIDERS.LAUNCX.toLowerCase(),
  launcx: PROVIDERS.LAUNCX.toLowerCase(),
  starpago: PROVIDERS.STARPAGO.toLowerCase(),
};

const normalizedProvider = providerAlias[provider] || provider;

if (normalizedProvider === PROVIDERS.LAUNCX.toLowerCase()) {
  await LauncxPayment(req, res);
  return;
} else if (normalizedProvider === PROVIDERS.STARPAGO.toLowerCase()) {
  if (!payMethod) {
    res.status(400).json({ error: "payMethod is required for StarPago" });
    return;
  }
  await StarPagoPayin(req, res);
  return;
} else {
  res.status(500).json({ error: `No provider configured for this wallet (${provider})` });
  return;
}


};


export default {
  autoCashinController,
  directPayin,
  payin,
  IndoPayin
}