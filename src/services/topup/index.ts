import { Decimal } from "@prisma/client/runtime/library";
import { parse, parseISO } from "date-fns";
import path from "path";
import { fileURLToPath } from "url";
import CustomError from "../../utils/custom_error.js";
import fs from "fs"
import * as csv from "fast-csv"
import { transactionService } from "../../services/index.js";

const createTopup = async (body: any, merchant_id: number) => {
    try {
        let transactionId = transactionService.createTransactionId();
        return await prisma?.$transaction(async (tx) => {
            const topup = await tx.topup.create({
                data: {
                    amount: body?.amount as Decimal,
                    orderId: transactionId,
                    fromMerchantId: body?.fromMerchantId,
                    toMerchantId: body?.toMerchantId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    reason: body.reason
                }
            });
            return topup;
        },
            {
                timeout: 10000,
                maxWait: 10000
            });
    } catch (err: any) {
        throw new CustomError(err.message, 500);
    }
};

const getTopups = async (params: any, merchantId: any) => {
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

        const topups = await prisma?.topup.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take + 1 }),
            where: {
                ...(merchantId ? {
                    OR: [
                        { fromMerchantId: parseInt(merchantId as string) },
                        { toMerchantId: parseInt(merchantId as string) }
                    ]
                } : {}),
                ...customWhere,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                fromMerchant: true,
                toMerchant: true
            }
        });

        // Check if topups is defined before accessing its properties
        const hasMore = Array.isArray(topups) && topups.length > take;
        if (hasMore) {
            topups.pop(); // Remove the extra record
        }

        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page as string) : 1,
            limit: take,
            hasMore,
        };

        const response = {
            topups: topups?.map((topup) => ({
                ...topup,
                merchant: null,
                from_merchant_name: topup.fromMerchant.full_name,
                to_merchant_name: topup?.toMerchant.full_name
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

export const exportTopup = async (merchantId: number, params: any) => {
    try {
        const startDate = params?.start?.replace(" ", "+");
        const endDate = params?.end?.replace(" ", "+");
        const merchantOrderId = params?.merchantOrderId as string;

        const filters: any = {};
        if (merchantId) filters["merchantId"] = {
            OR: [
                { fromMerchantId: parseInt(merchantId as unknown as string) },
                { toMerchantId: parseInt(merchantId as unknown as string) }
            ]
        };
        if (startDate && endDate) {
            filters["disbursementDate"] = {
                gte: parseISO(startDate),
                lt: parseISO(endDate),
            };
        }
        if (merchantOrderId) filters["orderId"] = merchantOrderId;

        const totalRecords = await prisma?.topup.count({ where: filters });
        let remainingRecords = totalRecords;
        console.log(`📊 Total disbursement disputes: ${totalRecords}`);

        const pageSize = 10000;
        let lastCursor: number | undefined = undefined;
        let hasMore = true;
        let processedCount = 0;

        const fileName = `topups_${Date.now()}.csv`;
        const filePath = path.join(EXPORT_DIR, fileName);
        const fileStream = fs.createWriteStream(filePath);
        const csvStream = csv.format({ headers: true });
        csvStream.pipe(fileStream);

        while (hasMore) {
            const batch: Array<any> = await prisma?.topup.findMany({
                where: filters,
                orderBy: { id: "asc" },
                cursor: lastCursor ? { id: lastCursor } : undefined,
                skip: lastCursor ? 1 : 0,
                take: pageSize,
                include: {
                    fromMerchant: { select: { full_name: true } },
                    toMerchant: { select: { full_name: true } }
                }
            }) || [];

            console.log(`🔄 Fetched batch: ${batch.length}`);
            // اگر remainingRecords undefined ہے تو اس کو صفر پر سیٹ کریں
            if (typeof remainingRecords === "undefined") {
                remainingRecords = 0;
            }
            remainingRecords -= batch.length;

            for (const record of batch) {
                csvStream.write({
                    from_merchant: record.fromMerchant?.full_name || "",
                    to_merchant: record.toMerchant?.full_name || "",
                    order_id: record.orderId,
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
    createTopup,
    getTopups,
    exportTopup
}