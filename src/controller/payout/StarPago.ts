import { Prisma } from "@prisma/client";
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
const starPagoPayoutController = async (req: Request, res: Response) => {
  let merchantAmount = new Decimal(0);
  let balanceDeducted = false;
  let findMerchant: any = null;

  try {
    let { amount, payMethod, bankCode, accountNo, accountName, email, mobile, order_id } = req.body;
    let { merchantId } = req.params;

    if (!amount || !payMethod || !bankCode || !accountNo || !accountName || !email || !mobile) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    findMerchant = await merchantService.findOne({ uid: merchantId });
    if (!findMerchant) return res.status(400).json({ error: "Merchant Not Found" });

    if (order_id) {
      const checkOrder = await prisma?.disbursement.findFirst({
        where: { merchant_custom_order_id: order_id },
      });
      if (checkOrder) return res.status(400).json({ error: "Order ID already exists" });
    }

    let totalCommission: Decimal = new Decimal(0);
    let totalGST: Decimal = new Decimal(0);
    let totalWithholdingTax: Decimal = new Decimal(0);
    let amountDecimal: Decimal = new Decimal(amount);

    let id = createTransactionId();
    order_id = order_id || id;
    merchantAmount = new Decimal(amount);

    // ⭐ Transaction Start
    await prisma?.$transaction(async (tx) => {
      let rate = await getMerchantRate(tx, findMerchant?.merchant_id as number);

      // Calculate deductions
      totalCommission = amountDecimal.mul(rate.disbursementRate);
      totalGST = amountDecimal.mul(rate.disbursementGST);
      totalWithholdingTax = amountDecimal.mul(rate.disbursementWithHoldingTax);

      const totalDeductions = totalCommission.plus(totalGST).plus(totalWithholdingTax);
      merchantAmount = amountDecimal.plus(totalDeductions); // same pattern as DalalMart

      if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
        throw new Error("Insufficient balance to disburse");
      }

      await adjustMerchantToDisburseBalance(findMerchant?.uid as string, +merchantAmount, false);
      balanceDeducted = true;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 60000,
      timeout: 60000,
    });

    // 🔑 StarPago Payload
    const payload: any = {
      appId: process.env.STARPAGO_APP_ID,
      merOrderNo: order_id,
      currency: "IDR",
      amount: amount,
      notifyUrl: process.env.STARPAGO_NOTIFY_URL,
      payMethod,
      extra: { email, mobile, bankCode, accountNo, accountName },
      attach: "StarPago Payout",
    };

    payload.sign = generateStarPagoSignature(process.env.STARPAGO_APP_SECRET!, payload);

    // API Call
    const response = await axios.post(
      `${process.env.STARPAGO_BASE_URL}/api/v2/payout/order/create`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    // Prisma Save
    const date = toZonedTime(new Date(), "Asia/Jakarta");
    const disbursement = await prisma?.disbursement.create({
      data: {
        merchant_id: findMerchant.merchant_id,
        disbursementDate: date,
        transactionAmount: amountDecimal,
        commission: totalCommission,
        gst: totalGST,
        withholdingTax: totalWithholdingTax,
        merchantAmount: amountDecimal,
        platform: 0,
        account: accountNo,
        provider: PROVIDERS.STARPAGO,
        status: "pending",
        response_message: "pending",
        to_provider: PROVIDERS.STARPAGO,
        providerDetails: { id: 1, sub_name: "StarPago" },
        system_order_id: id,
        merchant_custom_order_id: order_id,
      },
    });

    return res.status(200).json({
      status: "success",
      data: { response: response.data, disbursement },
      message: "Payout initiated successfully",
    });

  } catch (error: any) {
    console.error("StarPago Error:", error.message);
    if (balanceDeducted && findMerchant) {
      await adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true);
    }
    return res.status(500).json({ status: "error", message: error.message, data: error.response?.data });
  }
};


export default {
    starPagoPayoutController
}