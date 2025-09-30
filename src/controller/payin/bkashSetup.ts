import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { createTxn } from "./index.js";
import { PROVIDERS } from "../../constants/providers.js";
import { format } from "date-fns";

/**
 * Handles initiating a bKash payment via Setup gateway.
 * This flow is only used when `bkashDepositMethod` is configured for the merchant
 * to use the bKash Setup gateway.
 */

const createBkashTransactionId = () => {
  const currentTime = Date.now();
  const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
  const fractionalMilliseconds = Math.floor(
    (currentTime - Math.floor(currentTime)) * 1000
  );

  const txnRefNo = `BK${txnDateTime}${fractionalMilliseconds.toString()}${Math.random()
    .toString(36)
    .substr(2, 4)}`;
  return txnRefNo;
};

export const BkashSetupPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("=== BKASH SETUP PAYMENT START ===");
  try {
    const { merchantId } = req.params;
    console.log("Params:", JSON.stringify(req.params));
    console.log("Body:", JSON.stringify(req.body));

    const merchant = await prisma.merchant.findFirst({
      where: { uid: merchantId },
      include: { commissions: true },
    });

    if (!merchant) {
      console.log("❌ Merchant Not Found for ID:", merchantId);
      res.status(400).json({ error: "Merchant Not Found" });
      return;
    }

    let { amount, order_id, phone } = req.body as {
      amount: number | string;
      order_id?: string;
      phone?: string;
      merchantAssociationInfo?: string;
      payerReference?: string;
    };

    if (!amount) {
      console.log("❌ Missing amount field");
      res.status(400).json({ error: "amount is required" });
      return;
    }

    // This method is only for bKash deposits
    const id = createBkashTransactionId();
    order_id = order_id || id;

    const payload: Record<string, any> = {
      amount: typeof amount === "number" ? amount.toString() : amount,
      merchantInvoiceNumber: order_id,
      payerReference: phone || "0",
    };

    // Clean undefined keys
    Object.keys(payload).forEach(
      (key) => payload[key] === undefined && delete payload[key]
    );

    const baseUrl = "https://bkash.assanpay.com";
    const url = `${baseUrl}/api/initiate-payment`;
    console.log("📤 Initiating BKASH Setup Payment →", url);
    console.log("📦 Payload:", JSON.stringify(payload));

    const startedAt = Date.now();
    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 60000,
    });
    const elapsedMs = Date.now() - startedAt;
    console.log("⏱️  API Latency:", `${elapsedMs}ms`);
    console.log("📥 Response Status:", response.status);
    console.log("📥 Response Body:", JSON.stringify(response.data));

    // Create local transaction as pending prior to redirect
    console.log("💾 Creating Local Transaction (pending)...");
    await createTxn({
      order_id: order_id,
      transaction_id: id,
      amount: Number(amount),
      status: "pending",
      type: "wallet",
      merchant_id: merchant?.merchant_id,
      commission: merchant?.commissions[0]?.commissionRate,
      settlementDuration: merchant?.commissions[0]?.settlementDuration,
      providerDetails: {
        id: 1,
        name: PROVIDERS.BKASH,
        msisdn: phone,
        sub_name: "BKASH_SETUP",
        transactionId: response.data?.paymentID,
      },
    });
    console.log("✅ Local Transaction created");

    if (response.data?.paymentID) {
      console.log("✅ BKASH Setup Payment Initiated Successfully");
      const result = {
        status: "success",
        data: {
          url: response.data?.bkashURL,
          status: "Pending",
          reference: id,
        },
        message: 'Direct payment initiated successfully'
      };
      res.status(200).json(result);
      console.log("=== BKASH SETUP PAYMENT END ===");
      return;
    } else {
      console.log("❌ BKASH Setup Payment Failed - Missing paymentID");
      res.status(400).json({ error: "Payment Failed" });
      console.log("=== BKASH SETUP PAYMENT END ===");
      return;
    }
  } catch (err: any) {
    const status = err?.response?.status || 500;
    console.error("❌ BKASH Setup Error:", err?.message);
    if (err?.response?.data) {
      console.error("Error Response Body:", JSON.stringify(err.response.data));
    }
    console.error("Stack:", err?.stack);
    res
      .status(status)
      .json({ status: "error", message: err?.message, data: err?.response?.data });
    console.log("=== BKASH SETUP PAYMENT END (ERROR) ===");
    return;
  }
};

export default { BkashSetupPayment };

