import { Request, RequestHandler, Response } from "express";
import prisma from "../../lib/prisma.js";
import crypto from "crypto";
import { transactionService } from "../../services/index.js";
import { addWeekdays } from "../../utils/date_method.js";
import { JsonObject } from "@prisma/client/runtime/library";

export const LauncxPaynInCallback: RequestHandler = async (req: Request, res: Response) => {
  try {
    console.log("=== LAUNCX CALLBACK START ===");
    console.log("📥 Incoming body:", JSON.stringify(req.body, null, 2));

    const signature = req.headers["x-callback-signature"] as string;
    const secret = process.env.LAUNCX_CALLBACK_SECRET!;

    // ✅ Calculate HMAC
    const payload = JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (signature !== expected) {
      console.log("❌ Invalid signature");
      res.status(400).json({ error: "Invalid signature" });
      return
    }

    // ✅ Map status correctly
    const statusMap: Record<string, "completed" | "pending" | "failed"> = {
      PAID: "completed",
      SUCCESS: "completed",
      DONE: "completed",
      PENDING: "pending",
      FAILED: "failed",
    };
    const status = statusMap[req.body.status] || "pending";

    // ✅ Find transaction
    const txn = await prisma.transaction.findFirst({
      where: { transaction_id: req.body.orderId },
    });

    if (!txn) {
      console.log("❌ Transaction not found:", req.body.orderId);
      res.status(404).json({ error: "Transaction not found" });
      return
    }

    // ✅ Find merchant
    const merchant = await prisma.merchant.findFirst({
      where: { merchant_id: txn.merchant_id },
    });

    await prisma.transaction.update({
        where: { transaction_id: txn.transaction_id },
        data: {
            status,
            settled_amount: req.body.netAmount ?? 0,
            original_amount: req.body.grossAmount ?? 0,
            response_message: req.body.status ?? "",
            providerDetails: {
            ...(txn.providerDetails as JsonObject ?? {}),
            launcxTxn: String(req.body.orderId ?? ""),
            },
            updatedAt: new Date(),
        },
        });


    // ✅ If completed, schedule settlement
    if (status === "completed") {
      const scheduledAt = addWeekdays(new Date(), 1);
      await prisma.scheduledTask.create({
        data: {
          transactionId: txn.transaction_id,
          status: "pending",
          scheduledAt,
          executedAt: null,
        },
      });
    }

    // ✅ Send webhook to merchant
    await transactionService.sendCallback(
        merchant?.webhook_url ?? "",
        txn,
        String((txn?.providerDetails as JsonObject)?.account ?? ""),
        "payin",
        merchant?.encrypted === "True",
        false,
        status === "completed" ? "success" : "failed"
        );


    console.log("✅ Launcx callback processed successfully");
    console.log("=== LAUNCX CALLBACK END ===");
    res.json({ success: true, message: "ok" });
    return
  } catch (err: any) {
    console.error("❌ Launcx Webhook Error:", err.message);
    res.status(500).json({ error: err.message });
    return
  }
};

export default { LauncxPaynInCallback };