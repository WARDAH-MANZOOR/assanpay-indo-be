import { Decimal } from "@prisma/client/runtime/library";
import { parse, parseISO } from "date-fns";
import path from "path";
import { fileURLToPath } from "url";
import CustomError from "../../utils/custom_error.js";
import fs from "fs";
import * as csv from "fast-csv";
import { backofficeService } from "../index.js";

const createChargeBack = async (body: any, merchant_id: number) => {
    try {
        const transaction = await prisma?.transaction.findUnique({
            where: {
                merchant_transaction_id: body.order_id
            }
        })
        // Get chargeback amount
        const chargebackAmount = Number(transaction?.original_amount);
        console.log(chargebackAmount)
        if (!chargebackAmount || chargebackAmount <= 0) {
            throw new CustomError("Invalid chargeback amount", 400);
        }

        // Get balances
        const financials = await backofficeService.calculateFinancials(transaction?.merchant_id as number);
        const disbursementBalance = Number(financials.disbursementBalance || 0);
        const availableBalance = Number(financials.availableBalance || 0);

        let deductedFrom: 'disbursement' | 'available' | null = null;
        // Try to deduct from disbursement balance first
        if (disbursementBalance >= chargebackAmount) {
            await backofficeService.adjustMerchantDisbursementBalance(transaction?.merchant_id as number, chargebackAmount, true, "de");
            deductedFrom = 'disbursement';
        } else if (availableBalance >= chargebackAmount) {
            await backofficeService.adjustMerchantWalletBalance(transaction?.merchant_id as number, availableBalance - chargebackAmount, true);
            deductedFrom = 'available';
        } else {
            throw new CustomError("Insufficient funds in both disbursement and available balances", 400);
        }

        return await prisma?.$transaction(async (tx) => {
            
            const chargeback = await tx.chargeBack.create({
                data: {
                    amount: transaction?.original_amount as Decimal,
                    orderId: body.order_id,
                    reason: body.reason,
                    merchantId: transaction?.merchant_id as number,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return chargeback;
        },
            {
                timeout: 10000,
                maxWait: 10000
            });
    } catch (err: any) {
        throw new CustomError(err.message, 500);
    }
};

const getChargebacks = async (params: any, merchantId: any) => {
    try {
        let startDate = params.start as string;
        let endDate = params.end as string;
        const merchantOrderId = params.merchantOrderId as string; // NEW: Extract merchantOrderId from params

        const customWhere = {} as any;

        if (startDate && endDate) {
            startDate = startDate.replace(" ", "+");
            endDate = endDate.replace(" ", "+");

            const todayStart = parse(
                startDate,
                "yyyy-MM-dd'T'HH:mm:ssXXX",
                new Date()
            );
            const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

            customWhere["createdAt"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        if (merchantOrderId) { // NEW: Add merchantOrderId filter if provided
            customWhere["orderId"] = merchantOrderId;
        }

        let { page, limit } = params;
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }

        const chargebacks = await prisma?.chargeBack.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...(merchantId && { merchantId: parseInt(merchantId as string) }),
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                merchant: true
            }
        });

        const hasMore = Array.isArray(chargebacks) && chargebacks.length > take;
        if (hasMore && Array.isArray(chargebacks)) {
            chargebacks.pop(); // Remove the extra record
        }

        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page as string) : 1,
            limit: take,
            hasMore,
        };

        const response = {
            chargebacks: chargebacks?.map((dispute) => ({
                ...dispute,
                merchant: null,
                merchant_name: dispute.merchant.full_name
            })),
            meta,
        };

        return response;
    } catch (err) {
        console.log(err);
        throw new CustomError("Internal Server Error", 500);
    }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../../../files");
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });

export const exportChargebacks = async (merchantId: number, params: any) => {
  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");
    const merchantOrderId = params?.merchantOrderId as string;

    const filters: any = {};
    if (merchantId) filters["merchantId"] = +merchantId;
    if (startDate && endDate) {
      filters["disbursementDate"] = {
        gte: parseISO(startDate),
        lt: parseISO(endDate),
      };
    }
    if (merchantOrderId) filters["orderId"] = merchantOrderId;

    const totalRecords = await prisma?.chargeBack.count({ where: filters });
    let remainingRecords = totalRecords;
    console.log(`📊 Total disbursement disputes: ${totalRecords}`);

    const pageSize = 10000;
    let lastCursor: number | undefined = undefined;
    let hasMore = true;
    let processedCount = 0;

    const fileName = `chargebacks_${Date.now()}.csv`;
    const filePath = path.join(EXPORT_DIR, fileName);
    const fileStream = fs.createWriteStream(filePath);
    const csvStream = csv.format({ headers: true });
    csvStream.pipe(fileStream);

    while (hasMore) {
      if (!prisma) {
        throw new CustomError("Database connection not available", 500);
      }
      const batch: Array<any> = await prisma.chargeBack.findMany({
        where: filters,
        orderBy: { id: "asc" },
        cursor: lastCursor ? { id: lastCursor } : undefined,
        skip: lastCursor ? 1 : 0,
        take: pageSize,
        include: {
          merchant: { select: { full_name: true } }
        }
      });

      console.log(`🔄 Fetched batch: ${batch.length}`);
      if (typeof remainingRecords === "number") {
        remainingRecords -= batch.length;
      }

      for (const record of batch) {
        csvStream.write({
          merchant: record.merchant?.full_name || "",
          order_id: record.orderId,
          reason: record.reason,
          amount: record.amount
        });

        lastCursor = record.id;
        processedCount++;
      }

      console.log(`📦 Processed: ${processedCount} | Remaining: ${remainingRecords}`);
      hasMore = batch.length === pageSize;
    }

    await new Promise(resolve => csvStream.end(resolve));
    console.log(`✅ CSV saved at: ${filePath}`);

    return {
      filePath,
      downloadUrl: `https://server2.sahulatpay.com/files/${fileName}`,
      totalRecords: processedCount
    };

  } catch (error: any) {
    console.error("❌ Export failed:", error);
    throw new CustomError(
      error?.error || "Unable to get disbursement dispute data",
      error?.statusCode || 500
    );
  }
};

export default {
    createChargeBack,
    getChargebacks,
    exportChargebacks
}