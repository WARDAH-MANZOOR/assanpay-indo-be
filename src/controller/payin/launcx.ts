// src/controllers/payin/launcx.ts
import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { createTxn } from "./index.js";
import { PROVIDERS } from "../../constants/providers.js";

const launcxApi = axios.create({
  baseURL: process.env.NODE_ENV === "production"
    ? "https://launcx.com/api/v1"
    : "https://staging.launcx.com/api/v1",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.LAUNCX_API_KEY!,
  },
});

launcxApi.interceptors.request.use(cfg => {
  cfg.headers["x-timestamp"] = Date.now().toString();
  return cfg;
});

export const LauncxPayment = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { amount, order_id, playerId, flow = "redirect" } = req.body;

    const merchant = await prisma.merchant.findFirst({
      where: { uid: merchantId },
      include: { commissions: true },
    });

    if (!merchant) {
      return res.status(400).json({ error: "Merchant Not Found" });
    }

    const payload = {
      price: Number(amount),
      playerId: playerId || `merchant_${merchantId}`,
      flow,
    };

    const response = await launcxApi.post("/payments", payload, {
      validateStatus: () => true,
    });

    // local txn
    await createTxn({
      order_id: order_id || response.data?.data?.orderId,
      transaction_id: response.data?.data?.orderId,
      amount: Number(amount),
      status: "pending",
      type: "wallet",
      merchant_id: merchant?.merchant_id,
      commission: merchant?.commissions[0]?.commissionRate,
      settlementDuration: merchant?.commissions[0]?.settlementDuration,
      providerDetails: {
        name: PROVIDERS.LAUNCX,
        sub_name: PROVIDERS.QRIS, // always QRIS for Launcx
        transactionId: response.data?.data?.orderId,
      },
    });

    if (flow === "redirect" && response.status === 303) {
      return res.status(200).json({
        status: "success",
        url: response.headers.location,
      });
    }

    return res.status(200).json({
      status: "success",
      data: response.data,
    });
  } catch (err: any) {
    console.error("❌ Launcx Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
