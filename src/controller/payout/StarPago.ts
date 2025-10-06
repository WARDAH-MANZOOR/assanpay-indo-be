import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import axios from "axios";
import { PROVIDERS } from "../../constants/providers.js";
import { format } from "date-fns";
import { Request, Response } from "express";
import { merchantService, transactionService } from "../../services/index.js";
import FormData from "form-data"
import { toZonedTime } from "date-fns-tz";
import { generateStarPagoSignature } from "utils/starPagoSignature.js";

const createTransactionId = () => {
    const currentTime = Date.now();
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    const fractionalMilliseconds = Math.floor(
        (currentTime - Math.floor(currentTime)) * 1000
    );

    const txnRefNo = `DEV-${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
    return txnRefNo;
}

async function getMerchantRate(prsma: Prisma.TransactionClient, merchantId: number): Promise<{
    disbursementRate: Decimal;
    disbursementWithHoldingTax: Decimal;
    disbursementGST: Decimal;
}> {
    console.log("Merchant Id: ", merchantId)
    const merchant = await prsma.merchantFinancialTerms.findFirst({
        where: { merchant_id: merchantId },
    });

    if (!merchant) {
        throw new Error('Merchant not found');
    }

    return { disbursementRate: new Decimal(merchant.disbursementRate), disbursementGST: new Decimal(merchant.disbursementGST), disbursementWithHoldingTax: new Decimal(merchant.disbursementWithHoldingTax) };
}

const adjustMerchantToDisburseBalance = async (merchantId: string, amount: number, isIncrement: boolean) => {
    try {
        let obj;
        if (isIncrement) {
            obj = await prisma?.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        increment: amount
                    }
                },
            });
        } else {
            obj = await prisma?.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        decrement: amount
                    },
                },
            });
        }

        return {
            message: "Merchant balance updated successfully",
            obj
        };
    }
    catch (err: any) {
        throw new Error(err.message);
    }
}

function stringToBoolean(value: string): boolean {
    return value.toLowerCase() === "true";
}

const providerMap = {
    dana: "dana",
    oco: "ovo",
    qris: "qris",
    va: "virtual_account",
    gopay: "gopay",
    linkaja: "linkaja",
    shopeepay: "shopeepay",
};

function formatProvider(input: string): string | null {
    const key = input.toLowerCase();
    // اردو: یہاں ہم providerMap کو اس طرح استعمال کر رہے ہیں کہ ٹائپ اسکرپٹ کی ایرر نہ آئے
    // English: Here, we are using providerMap in a way that avoids TypeScript error
    return (providerMap as Record<string, string>)[key] || null;
}
const STAR_PAGO_METHODS: Record<string, { code: string; bankCode: string }> = {
  ovo: { code: "ID_OVO", bankCode: "OVO" },
  id_ovo: { code: "ID_OVO", bankCode: "OVO" },
  dana: { code: "ID_DANA", bankCode: "DANA" },
  id_dana: { code: "ID_DANA", bankCode: "DANA" },
  shopeepay: { code: "ID_SHOPEEPAY", bankCode: "SHOPEEPAY" },
  id_shopeepay: { code: "ID_SHOPEEPAY", bankCode: "SHOPEEPAY" },
  gopay: { code: "ID_GOPAY", bankCode: "GOPAY" },
  id_gopay: { code: "ID_GOPAY", bankCode: "GOPAY" },
  linkaja: { code: "ID_LINKAJA", bankCode: "LINKAJA" },
  id_linkaja: { code: "ID_LINKAJA", bankCode: "LINKAJA" },
  va: { code: "ID_VA", bankCode: "" },
  id_va: { code: "ID_VA", bankCode: "" },
};


export const starPagoPayoutController = async (req: Request, res: Response) => {
  let merchantAmount = new Decimal(0);
  let balanceDeducted = false;
  let findMerchant: any = null;

  try {
    const { amount, payMethod, bankCode, accountNo, accountName, email, mobile, order_id } = req.body;
    const { merchantId } = req.params;

    if (!amount || !payMethod || !bankCode || !accountNo || !accountName || !email || !mobile) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔍 Get merchant
    findMerchant = await merchantService.findOne({ uid: merchantId });
    if (!findMerchant) return res.status(400).json({ error: "Merchant Not Found" });

    // 🔍 Prevent duplicate order
    if (order_id) {
      const checkOrder = await prisma.disbursement.findFirst({
        where: { merchant_custom_order_id: order_id },
      });
      if (checkOrder) return res.status(400).json({ error: "Order ID already exists" });
    }

    const id = createTransactionId();
    const finalOrderId = order_id || id;
    const amountDecimal = new Decimal(amount);

    // 🔹 Calculate Deductions
    await prisma.$transaction(async (tx) => {
      const rate = await getMerchantRate(tx, findMerchant.merchant_id);

      const totalCommission = amountDecimal.mul(rate.disbursementRate);
      const totalGST = amountDecimal.mul(rate.disbursementGST);
      const totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);

      const totalDeductions = totalCommission.plus(totalGST).plus(totalWithholdingTax);
      merchantAmount = amountDecimal.plus(totalDeductions);

      if (findMerchant.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
        throw new Error("Insufficient balance to disburse");
      }

      await adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, false);
      balanceDeducted = true;
    });
    const method = STAR_PAGO_METHODS[payMethod.toLowerCase()];
    if (!method) {
      return res.status(400).json({ error: `Invalid payMethod: ${payMethod}` });
    }
    const finalBankCode = method.bankCode || bankCode;
    if (!finalBankCode && method.code !== "ID_VA") {
      return res
        .status(400)
        .json({ error: `bankCode is required for payMethod: ${payMethod}` });
    }

    console.log("Balance To Disburse:", findMerchant.balanceToDisburse.toString());
    console.log("Calculated Merchant Amount:", merchantAmount.toString());

    // 🔑 Construct StarPago Payout Payload (same structure as your working Postman test)
    const payloadWithoutSign = {
      appId: process.env.STARPAGO_APP_ID!,
      merOrderNo: finalOrderId,
      currency: "IDR",
      amount: amount.toString(),
      notifyUrl: process.env.STARPAGO_NOTIFY_URL!,
      payMethod:method.code,  // ✅ raw name like 'ovo', 'dana',
      extra: {
        bankCode: finalBankCode,
        accountNo,
        accountName,
        email,
        mobile,
      },
      attach: "StarPago Payout",
    };
    // ✅ Generate signature
      const sign = generateStarPagoSignature(
        payloadWithoutSign, process.env.STARPAGO_SECRET!
      );

    const payload = { ...payloadWithoutSign, sign };
    console.log("🟢 StarPago Payout Payload:", JSON.stringify(payload, null, 2));

    // 🚀 API Request
    const response = await axios.post(
      `${process.env.STARPAGO_BASE_URL}/api/v2/payout/order/create`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    // 🧾 Save in DB
    const date = toZonedTime(new Date(), "Asia/Jakarta");
    const disbursement = await prisma.disbursement.create({
      data: {
        merchant_id: findMerchant.merchant_id,
        disbursementDate: date,
        transactionAmount: amountDecimal,
        commission: new Decimal(0),
        gst: new Decimal(0),
        withholdingTax: new Decimal(0),
        merchantAmount: amountDecimal,
        platform: 0,
        account: accountNo,
        provider: PROVIDERS.STARPAGO,
        status: "pending",
        response_message: "pending",
        to_provider: PROVIDERS.STARPAGO,
        providerDetails: { id: 1, sub_name: "StarPago" },
        system_order_id: id,
        merchant_custom_order_id: finalOrderId,
      },
    });

    return res.status(200).json({
      status: "success",
      data: {
        payoutResponse: response.data,
      },
    });
  } catch (error: any) {
    console.error("🚨 StarPago Payout Error:", error.message);
    if (balanceDeducted && findMerchant) {
      await adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
    }
    return res.status(500).json({
      status: "error",
      message: error.message,
      data: error.response?.data || null,
    });
  }
};

export default {
  starPagoPayoutController,
};
