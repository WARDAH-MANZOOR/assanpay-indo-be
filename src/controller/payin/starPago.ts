// // src/controllers/payin/starpago.ts

import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { createTxn } from "./index.js";
import { PROVIDERS } from "../../constants/providers.js";
import { generateStarPagoSignature } from "../../utils/starPagoSignature.js";
import { TransactionStatus } from "@prisma/client"; // 👈 Prisma Enum
import { transactionService } from "services/index.js";
import { addWeekdays } from "../../utils/date_method.js";

const STARPAGO_HOST =
  process.env.NODE_ENV === "production"
    ? process.env.STARPAGO_PROD_URL
    : process.env.STARPAGO_SANDBOX_URL;

/**
 * Create StarPago Payin
 */
export const StarPagoPayin = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const {
      amount,
      order_id,
      payMethod,
      bankCode,
      mobile,
      email,
      accountName,
      accountNo,
      returnUrl,
      attach,
    } = req.body;

    const merchant = await prisma.merchant.findFirst({
      where: { uid: merchantId },
      include: { commissions: true },
    });

    if (!merchant) {
      return res.status(400).json({ error: "Merchant Not Found" });
    }

    // ✅ Payload (without sign)
    const payloadWithoutSign = {
      appId: process.env.STARPAGO_APP_ID!,
      merOrderNo: order_id,
      notifyUrl: process.env.STARPAGO_NOTIFY_URL!, // REQUIRED
      currency: "IDR", // ✅ always IDR
      amount: String(amount), // ✅ ensure string
      payMethod,
      extra: {
        mobile,
        email,
        accountName,
        bankCode,
        accountNo,
      },
      attach: attach || "starpago", // optional but useful for tracking
      returnUrl: returnUrl || process.env.STARPAGO_RETURN_URL, // ✅ fallback
    };

    // ✅ Generate signature
    const sign = generateStarPagoSignature(
      process.env.STARPAGO_SECRET!,
      payloadWithoutSign
    );

    const payload = { ...payloadWithoutSign, sign };

    // ✅ API call
    const response = await axios.post(
      `${STARPAGO_HOST}/api/v2/payment/order/create`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = response.data?.data || {};

    // ✅ Create local txn record
    await createTxn({
      order_id,
      transaction_id: data.orderNo,
      amount: Number(amount),
      status: TransactionStatus.pending, // ✅ use enum
      type: "wallet",
      merchant_id: merchant.merchant_id,
      commission: merchant.commissions[0]?.commissionRate,
      settlementDuration: merchant.commissions[0]?.settlementDuration,
      providerDetails: {
        name: PROVIDERS.STARPAGO,
        sub_name: payMethod,
        transactionId: data.orderNo,
      },
    });

    return res.status(200).json({
      status: "success",
      data: response.data,
    });
  } catch (err: any) {
    console.error("❌ StarPago Payin Error:", err.response?.data || err.message);
    return res.status(500).json({ error: err.message });
  }
};
export default { StarPagoPayin };