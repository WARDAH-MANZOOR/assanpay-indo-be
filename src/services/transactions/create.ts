import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client/extension";
import { transactionService } from "../../services/index.js";
import { toZonedTime } from "date-fns-tz";

async function getMerchantCommission(merchantId: number, prisma: PrismaClient): Promise<number> {
    console.log(merchantId);
    const merchant = await prisma.merchantFinancialTerms.findUnique({
        where: { merchant_id: merchantId },
    });
    if (!merchant) {
        throw new CustomError('Merchant not found', 404);
    }

    return +Number(merchant.commissionRate) + +Number(merchant.commissionGST) + +Number(merchant.commissionWithHoldingTax);
}

async function findOrCreateCustomer(customerName: string, customerEmail: string, merchantId: number, prisma: PrismaClient) {
    let customer = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: {
            groups: {
                include: {
                    group: {
                        select: {
                            id: true
                        }
                    }
                }
            }
        }
    });
    if (!customer) {
        let new_customer = await prisma.user.create({
            data: {
                username: customerName,
                email: customerEmail,
                password: '', // Handle password appropriately
            },
        });
        await prisma.userGroup.create({
            data: {
                userId: new_customer.id,
                groupId: 3,
                merchantId
            }
        })
        return new_customer;
    }
    else if (customer.groups.find((user: any) => user.groupId != 2)) {
        throw new CustomError("Given user is not a customer", 400);
    }
    return customer;
}

function calculateSettledAmount(originalAmount: number, commissionPercentage: number | Decimal): number {
    return originalAmount * (1 - +commissionPercentage);
}

async function createTransactionRecord({
    order_id,
    id,
    originalAmount,
    type,
    merchantId,
    settledAmount,
    customerId,
}: {
    order_id: string;
    id: string;
    originalAmount: number;
    type: string;
    merchantId: number;
    settledAmount: number;
    customerId: number;
},
    prisma: PrismaClient) {
    if (type != "wallet" && type != "card" && type != "bank") {
        return;
    }
    let data: { transaction_id?: string } = {};
    if (order_id) {
        data["transaction_id"] = order_id;
    }
    else {
        data["transaction_id"] = transactionService.createTransactionId();
    }
    // Get the current date
    const date = new Date();

    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';

    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(date, timeZone);
    const transaction = await prisma.transaction.create({
        data: {
            ...data,
            date_time: zonedDate,
            original_amount: originalAmount,
            status: 'pending', // Ensure this matches your enum
            type,
            settled_amount: settledAmount,
            balance: settledAmount,
            merchant: {
                connect: { id: merchantId },
            },
            customer: {
                connect: { id: customerId },
            },
        },
    });

    return transaction;
}

function createTransactionToken(transactionId: string) {
    const secret = process.env.JWTSECRET || 'your_default_secret';
    const token = jwt.sign({ transactionId }, secret, { expiresIn: '1h' });
    return token;
}

async function generateTransactionLink(transactionId: string) {
    const baseUrl = 'http://localhost:3005/payment';

    const token = createTransactionToken(transactionId);

    const transactionLink = `${baseUrl}?t=${encodeURIComponent(token)}&signupUrlResourceParams=${encodeURIComponent(
        transactionId
    )}`;

    return transactionLink;
}

const createTransaction = async (obj: any) => {
    try {
        const result = await prisma.$transaction(async (prismaTransaction) => {
            const commissionPercentage = await getMerchantCommission(obj.merchant_id, prismaTransaction);
            const customer = await findOrCreateCustomer(obj.customerName, obj.customerEmail, obj.merchant_id, prismaTransaction);
            const customerId = customer?.id;
            const originalAmount = parseFloat(obj.original_amount);
            const settledAmount = calculateSettledAmount(originalAmount, commissionPercentage);
            // Create a new transaction request in the database
            const transaction = await createTransactionRecord({
                order_id: obj.order_id,
                id: obj.id,
                originalAmount: originalAmount,
                type: obj.type,
                merchantId: obj.merchant_id,
                settledAmount: settledAmount,
                customerId: customerId as number
            },
                prismaTransaction);
            return { transaction };
        });
        const transactionLink = await generateTransactionLink(result?.transaction.transaction_id as string);
        return {
            result,
            transactionLink
        }

    }
    catch (err) {
        console.error('Error creating transaction request:', err);

        if (err instanceof CustomError) {
            throw new Error(err.message);
        }

        throw new Error("Internal Server Error");
    }
}

const createTransactionService = async (body: any) => {
    try {
        const merchant = await prisma.merchantFinancialTerms.findUnique({
            where: { merchant_id: parseInt(body.merchant_id) },
        });
        // Calculate Settlement Values
        const commission = (Number(merchant?.commissionRate) ?? 1) * body.original_amount;
        const gst = (Number(merchant?.commissionGST) ?? 1) * body.original_amount;
        const withholdingTax = (Number(merchant?.commissionWithHoldingTax) ?? 1) * body.original_amount; // Example: 10% withholding tax
        const merchantAmount = body.original_amount - commission - gst - withholdingTax;
        // Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                merchant_id: body.merchant_id,
                original_amount: body.original_amount,
                status: "completed",
                type: "wallet",
                date_time: new Date(),
                settlement: true,
                balance: merchantAmount,
            },
        });
        // Update or Create SettlementReport
        const today = new Date();
        const settlementDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const settlement = await prisma.settlementReport.upsert({
            where: {
                merchant_id_settlementDate: {
                    merchant_id: body.merchant_id,
                    settlementDate,
                },
            },
            update: {
                transactionCount: { increment: 1 },
                transactionAmount: { increment: body.original_amount },
                commission: { increment: commission },
                gst: { increment: gst },
                withholdingTax: { increment: withholdingTax },
                merchantAmount: { increment: merchantAmount },
            },
            create: {
                merchant_id: body.merchant_id,
                settlementDate,
                transactionCount: 1,
                transactionAmount: body.original_amount,
                commission,
                gst,
                withholdingTax,
                merchantAmount,
            },
        });
        return { transaction, settlement };
    }
    catch (err) {
        return err;
    }
}

export { createTransaction, createTransactionService };