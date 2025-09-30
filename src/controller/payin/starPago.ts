// src/controllers/payin/starpago.ts
import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { createTxn } from "./index.js";
import { PROVIDERS } from "../../constants/providers.js";

const STARPAGO_HOST = process.env.NODE_ENV === "production"
  ? process.env.STARPAGO_PROD_URL
  : process.env.STARPAGO_SANDBOX_URL;

export const StarPagoPayin = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { amount, order_id, payMethod, bankCode, mobile, email, accountName, accountNo, returnUrl } = req.body;

    const merchant = await prisma.merchant.findFirst({
      where: { uid: merchantId },
      include: { commissions: true },
    });

    if (!merchant) {
      return res.status(400).json({ error: "Merchant Not Found" });
    }

    const payload = {
      appId: process.env.STARPAGO_APP_ID,
      merOrderNo: order_id,
      notifyUrl: process.env.STARPAGO_NOTIFY_URL,
      sign: "SIGNATURE_GENERATED_HERE", // TODO: implement signing function
      currency: "IDR",
      amount: String(amount),
      payMethod,
      extra: {
        mobile,
        email,
        accountName,
        bankCode,
        accountNo,
      },
      returnUrl,
    };

    const response = await axios.post(`${STARPAGO_HOST}/api/v2/payment/order/create`, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // local txn
    await createTxn({
      order_id,
      transaction_id: response.data?.orderNo,
      amount: Number(amount),
      status: "pending",
      type: "wallet",
      merchant_id: merchant?.merchant_id,
      commission: merchant?.commissions[0]?.commissionRate,
      settlementDuration: merchant?.commissions[0]?.settlementDuration,
      providerDetails: {
        name: PROVIDERS.STARPAGO,
        sub_name: payMethod, // wallet selected by client
        transactionId: response.data?.orderNo,
      },
    });

    return res.status(200).json({
      status: "success",
      data: response.data,
    });
  } catch (err: any) {
    console.error("❌ StarPago Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
