
import { Request, RequestHandler, Response } from "express";
import prisma from "../../lib/prisma.js";
import { PROVIDERS } from "../../constants/providers.js";
import { generateStarPagoSignature } from "../../utils/starPagoSignature.js";
import { TransactionStatus } from "@prisma/client"; // 👈 Prisma Enum
import { transactionService } from "services/index.js";
import { addWeekdays } from "../../utils/date_method.js";


export const StarPagoPayInCallback: RequestHandler= async (req: Request, res: Response) => {
  try {
    console.log("=== STARPAGO CALLBACK START ===");
    console.log("📥 Incoming body:", JSON.stringify(req.body, null, 2));

    const { sign, ...rest } = req.body;

    // // ✅ Signature verify
    // const expectedSign = generateStarPagoSignature(process.env.STARPAGO_SECRET!, rest);
    // if (sign !== expectedSign) {
    //   console.log("❌ Invalid signature");
    //   res.status(400).json({ error: "Invalid signature" });
    //   return
    // }
// 🔹 Use ONLY required fields for signature verification
    const fieldsForSign = {
      orderStatus: rest.orderStatus,
      orderNo: rest.orderNo,
      merOrderNo: rest.merOrderNo,
      amount: rest.amount,
      currency: rest.currency,
      attach: rest.attach,
      createTime: rest.createTime,
      updateTime: rest.updateTime,
    };

    const expectedSign = generateStarPagoSignature(fieldsForSign, process.env.STARPAGO_SECRET!);
    if (sign !== expectedSign) {
      console.log("❌ Invalid signature");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }
    // ✅ Status mapping
    const statusMap: Record<string, TransactionStatus> = {
      "2": TransactionStatus.completed,
      "3": TransactionStatus.completed,
      "-1": TransactionStatus.failed,
      "-2": TransactionStatus.failed,
      "-3": TransactionStatus.failed,
      "0": TransactionStatus.pending,
      "1": TransactionStatus.pending,
      "-4": TransactionStatus.pending,
    };
    const updatedStatus = statusMap[String(rest.orderStatus)] || TransactionStatus.pending;

    // ✅ Transaction lookup
    const txn = await prisma.transaction.findFirst({
      where: { transaction_id: rest.orderNo }
    });

    if (!txn) {
      console.log("❌ Transaction not found:", rest.orderNo);
      res.status(404).json({ error: "Transaction not found" });
      return
    }

    // ✅ Merchant lookup
    const merchant = await prisma.merchant.findFirst({
      where: { merchant_id: txn.merchant_id }
    });

    // ✅ Update transaction
    await prisma.transaction.update({
      where: { transaction_id: txn.transaction_id },
      data: {
        status: updatedStatus,
        original_amount: Number(rest.realAmount || rest.amount),
        settled_amount: updatedStatus === TransactionStatus.completed
          ? Number(rest.realAmount || rest.amount)
          : undefined,
        providerDetails: {
          ...(txn.providerDetails as any),
          starPagoTxn: rest.thirdOrderNo,
        },
        updatedAt: new Date(),
      }
    });

    // ✅ If success, schedule task
    if (updatedStatus === TransactionStatus.completed) {
      const scheduledAt = addWeekdays(new Date(), 1);
      await prisma.scheduledTask.create({
        data: {
          transactionId: txn.transaction_id,
          status: "pending",
          scheduledAt,
          executedAt: null,
        }
      });
    }

    // ✅ Send webhook to merchant
    await transactionService.sendCallback(
      merchant?.webhook_url!,
      txn,
      (txn?.providerDetails as any)?.account,
      "payin",
      merchant?.encrypted === "True",
      false,
      updatedStatus === TransactionStatus.completed ? "success" : "failed"
    );

    console.log("✅ StarPago callback processed successfully");
    console.log("=== STARPAGO CALLBACK END ===");
    res.json({ message: "ok" });
    return

  } catch (err: any) {
    console.error("❌ StarPago Webhook Error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
    return
  }
};

export const StarPagoPayoutCallback:RequestHandler = async (req: Request, res: Response) => {
  try {
    console.log("=== STARPAGO PAYOUT CALLBACK START ===");
    console.log("📥 Incoming body:", JSON.stringify(req.body, null, 2));

    const { sign, ...rest } = req.body;

    // // ✅ Signature verify
    // const expectedSign = generateStarPagoSignature(process.env.STARPAGO_SECRET!, rest);
    // if (sign !== expectedSign) {
    //   console.log("❌ Invalid signature");
    //   res.status(400).json({ error: "Invalid signature" });
    //   return
    // }
    const fieldsForSign = {
      orderStatus: rest.orderStatus,
      orderNo: rest.orderNo,
      merOrderNo: rest.merOrderNo,
      amount: rest.amount,
      currency: rest.currency,
      attach: rest.attach,
      createTime: rest.createTime,
      updateTime: rest.updateTime,
    };

    const expectedSign = generateStarPagoSignature(fieldsForSign, process.env.STARPAGO_SECRET!);
    if (sign !== expectedSign) {
          console.log("❌ Invalid signature");
          res.status(400).json({ error: "Invalid signature" });
          return;
        }

    // ✅ Status mapping
    const statusMap: Record<string, string> = {
      "2": "completed",
      "3": "completed",
      "-1": "failed",
      "-2": "failed",
      "-3": "failed",
      "0": "pending",
      "1": "pending",
      "-4": "pending",
    };
    const updatedStatus = statusMap[String(rest.orderStatus)] || "pending";

    // ✅ Find disbursement record
    const disb = await prisma.disbursement.findFirst({
      where: { system_order_id: rest.orderNo }
    });

    if (!disb) {
      console.log("❌ Disbursement not found:", rest.orderNo);
      res.status(404).json({ error: "Disbursement not found" });
      return
    }

    // ✅ Merchant lookup
    const merchant = await prisma.merchant.findFirst({
      where: { merchant_id: disb.merchant_id }
    });

    // ✅ Update disbursement record
    await prisma.disbursement.update({
      where: { id: disb.id },   // ✅ use correct PK
      data: {
        status: updatedStatus,
        response_message: rest.message || rest.orderStatus,
        providerDetails: {
          ...(disb.providerDetails as any),
          receiptUrl: rest.receiptUrl,
          starPagoTxn: rest.orderNo,
        },
        updatedAt: new Date(),
      }
    });


    // ✅ Send callback to merchant
    await transactionService.sendCallback(
      merchant?.webhook_url ?? "",
      disb,
      (disb?.providerDetails as any)?.account,
      "payout",
      merchant?.encrypted === "True",
      false,
      updatedStatus === "completed" ? "success" : "failed"
    );

    console.log("✅ StarPago payout callback processed successfully");
    console.log("=== STARPAGO PAYOUT CALLBACK END ===");
    
    res.json({ message: "ok" });
    return

  } catch (err: any) {
    console.error("❌ StarPago Payout Webhook Error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
    return
  }
};



export default{ StarPagoPayInCallback,StarPagoPayoutCallback };