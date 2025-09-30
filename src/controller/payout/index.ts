import { $Enums, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import axios from "axios";
import { PROVIDERS } from "../../constants/providers.js";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Request, Response } from "express";
import { merchantService, transactionService } from "../../services/index.js";
import { v4 as uuidv4 } from "uuid"
import dalalmart from "./dalalmart.js";

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

const createTransactionId = () => {
    const currentTime = Date.now();
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    const fractionalMilliseconds = Math.floor(
        (currentTime - Math.floor(currentTime)) * 1000
    );

    const txnRefNo = `T${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
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

const payout = async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const body = req.body;

    if (Number(body.amount) < 400) {
        return res.status(400).json({ error: 'Minimum 500 bdt is required for withdrawal' });
    }
    const merchant = await prisma?.merchant.findFirst({
      where: {
        uid: merchantId
      },
      select: {
        withdrawalMethod: true,
        bkashWithdrawalMethod: true,
        nagadWithdrawalMethod: true
      }
    })
  
    if (!merchant) {
      return res.status(400).json({ error: 'Merchant Not Found' });
    }

    let withdrawalMethod: string = '';
    if (body.payment_method == 'bkash') {
        withdrawalMethod = merchant.bkashWithdrawalMethod as string;
    }
    else {
        withdrawalMethod = merchant?.nagadWithdrawalMethod as string
    }
  
    if (withdrawalMethod == "PAYINX") {
      await payoutController(req, res);
    }
    else {
      await dalalmart.dalalMartPayoutController(req,res)
    }
  
  }
const payoutController = async (req: Request, res: Response) => {
    let merchantAmount = new Decimal(0)
    let balanceDeducted = false;
    let findMerchant: any = null;
    try {
        let { amount, payment_method, phone, order_id } = req.body;
        let { merchantId } = req.params;

        if (!amount || !payment_method || !phone) {
            return res.status(400).json({ error: 'amount, currency, payment_method, phone are required' });
        }
        if (!['bkash', 'nagad'].includes(payment_method)) {
            return res.status(400).json({ error: 'payment_method must be bkash or nagad' });
        }

        findMerchant = await merchantService.findOne({
            uid: merchantId,
        });

        if (!findMerchant) {
            return res.status(400).json({ error: 'Merchant Not Found' });
        }

        if (order_id) {
            const checkOrder = await prisma?.disbursement.findFirst({
                where: {
                    merchant_custom_order_id: order_id,
                },
            });
            if (checkOrder) {
                return res.status(400).json({ error: "Order ID already exists" });
            }
        }

        let totalCommission: Decimal = new Decimal(0);
        let totalGST: Decimal = new Decimal(0);
        let totalWithholdingTax: Decimal = new Decimal(0);
        let amountDecimal: Decimal = new Decimal(amount);
        let data: { transaction_id?: string, merchant_custom_order_id?: string, system_order_id?: string } = {};
        let id = createTransactionId();
        order_id = order_id || id;
        let reference;
            reference = order_id;
        data["merchant_custom_order_id"] = order_id;
        data["system_order_id"] = id;
        merchantAmount = new Decimal(amount);

        await prisma?.$transaction(async (tx) => {
            try {
                let rate = await getMerchantRate(tx, findMerchant?.merchant_id as number);

                // Calculate total deductions and merchant amount
                totalCommission = amountDecimal.mul(rate.disbursementRate);
                totalGST = amountDecimal.mul(rate.disbursementGST);
                totalWithholdingTax = amountDecimal.mul(
                    rate.disbursementWithHoldingTax
                );
                const totalDeductions = totalCommission
                    .plus(totalGST)
                    .plus(totalWithholdingTax);
                merchantAmount = amount
                    ? amountDecimal.plus(totalDeductions)
                    : amountDecimal.minus(totalDeductions);

                // Get eligible transactions
                if (findMerchant?.balanceToDisburse && merchantAmount.gt(findMerchant.balanceToDisburse)) {
                    throw new Error("Insufficient balance to disburse");
                }
                const result = await adjustMerchantToDisburseBalance(findMerchant?.uid as string, +merchantAmount, false);
                balanceDeducted = true;
                console.log(JSON.stringify({ event: "BALANCE_ADJUSTED", id, amount: +merchantAmount.toString(), order_id: order_id })) // Adjust the balance
            }
            catch (err) {
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2034') {
                        await prisma?.disbursement.create({
                            data: {
                                ...data,
                                // transaction_id: id,
                                merchant_id: Number(findMerchant?.merchant_id),
                                disbursementDate: new Date(),
                                transactionAmount: amountDecimal,
                                commission: totalCommission,
                                gst: totalGST,
                                withholdingTax: totalWithholdingTax,
                                merchantAmount: amount ? amount : merchantAmount,
                                platform: 0,
                                account: phone,
                                provider: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
                                status: "Pending",
                                response_message: "Pending",
                                to_provider: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
                                providerDetails: {
                                    id: 1
                                }
                            },
                        });
                        throw new Error("Transaction is Pending");
                    }
                }
                throw new Error("Not Enough Balance");
            }
        }, {
            // isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
            maxWait: 60000,
            timeout: 60000,
        })
        const payload = { amount, currency: "BDT", payment_method, withdraw_number: phone, callback_url: process.env.PAYOUT_CALLBACK_URL, reference };

        const response = await axios.post(
            `${process.env.PAYINX_BASE_URL}/api/v1/payout_request`,
            payload,
            { headers: getHeaders(true) }
        );

        if (response.data.status === 200 || response.data.status === 201) {
            data["transaction_id"] = response?.data?.data?.payment_id;
            // Get the current date
            const date = new Date();

            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';

            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            // Create disbursement record
            let disbursement = await prisma?.disbursement.create({
                data: {
                    ...data,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: amount ? amount : merchantAmount,
                    platform: 0,
                    account: phone,
                    provider: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
                    status: "pending",
                    response_message: "pending",
                    providerDetails: {
                        id: 1,
                        sub_name: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD
                    }
                },
            });
            delete response.data?.data["callback_url"]
            return res.status(200).json({ status: 'success', data: response.data, message: 'Payout initiated successfully' });
        } else {
            await adjustMerchantToDisburseBalance(findMerchant.uid, +merchantAmount, true); // Adjust the balance
            data["transaction_id"] = id;

            const date = new Date();

            // Define the Pakistan timezone
            const timeZone = 'Asia/Karachi';

            // Convert the date to the Pakistan timezone
            const zonedDate = toZonedTime(date, timeZone);
            await prisma?.disbursement.create({
                data: {
                    ...data,
                    // transaction_id: id,
                    merchant_id: Number(findMerchant.merchant_id),
                    disbursementDate: zonedDate,
                    transactionAmount: amountDecimal,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount: amount ? amount : merchantAmount,
                    platform: 0,
                    account: phone,
                    provider: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
                    status: "failed",
                    response_message: response.data.message,
                    providerDetails: {
                        id: 1,
                        sub_name: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD
                    }
                },
            });
            balanceDeducted = false;
            return res.status(response.data.status).json({ status: 'error', message: 'Payout initiation failed', data: response.data });
        }
    } catch (error: any) {
        console.error('Error initiating payout:', error.message);
        if (balanceDeducted) {
            await adjustMerchantToDisburseBalance(findMerchant?.uid as string, +merchantAmount, true); // Adjust the balance
          }
        return res.status(500).json({ status: 'error', message: error.message, data: error.response?.data });
    }
}

export default {
    payoutController,
    payout
}

