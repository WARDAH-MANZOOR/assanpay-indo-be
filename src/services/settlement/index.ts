import { parse } from "date-fns";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import { Parser } from "json2csv";

const getSettlement = async (params: any, user: JwtPayload) => {
  const merchantId = user?.merchant_id || params.merchant_id;

  if (!merchantId && user?.role !== "Admin") {
    throw new CustomError("Merchant ID is required", 400);
  }

  let filters: { merchant_id?: number } = {};

  if (merchantId) {
    filters["merchant_id"] = +merchantId;
  }

  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {} as any;

    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere["settlementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    let { page, limit } = params;
    // Query based on provided parameters
    let skip, take = 0;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const reports = await prisma.settlementReport.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take + 1 }),
      where: {
        ...filters,
        ...customWhere,
      },
      include: {
        merchant: {
          select: {
            uid: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        settlementDate: "desc"
      }
    });
    const hasMore = reports.length > take;
    if (hasMore) {
      reports.pop(); // Remove the extra record
    }

    // Build meta with hasMore flag
    const meta = {
      page: page ? parseInt(page as string) : 1,
      limit: take,
      hasMore,
    };

    const response = {
      transactions: reports.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant,
      })),
      meta,
    };

    return response;
  } catch (error: any) {
    return error;
  }
};

const exportSettlement = async (params: any, user: JwtPayload) => {
  const merchantId = user?.merchant_id || params.merchant_id;

  if (!merchantId && user?.role !== "Admin") {
    throw new CustomError("Merchant ID is required", 400);
  }

  let filters: { merchant_id?: number } = {};

  if (merchantId) {
    filters["merchant_id"] = +merchantId;
  }

  try {
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {} as any;

    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere["settlementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    const reports = await prisma.settlementReport.findMany({
      where: {
        ...filters,
        ...customWhere,
      },
      include: {
        merchant: {
          select: {
            uid: true,
            full_name: true,
          },
        },
      }
    });

    const totalAmount = reports.reduce((sum, transaction) => sum + Number(transaction.merchantAmount), 0);

    // res.setHeader('Content-Type', 'text/csv');
    // res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

    const fields = [
      'merchant',
      'merchant_id',
      'settlement_date',
      'transaction_count',
      'transaction_amount',
      'commission',
      'gst',
      'withholding_tax',
      'merchant_amount'
    ];

    const data = reports.map(transaction => ({
      merchant: transaction.merchant.full_name,
      merchant_id: transaction.merchant.uid,
      settlement_date: transaction.settlementDate,
      transaction_count: transaction.transactionCount,
      transaction_amount: transaction.transactionAmount,
      commission: transaction.commission,
      gst: transaction.gst,
      withholding_tax: transaction.withholdingTax,
      merchant_amount: transaction.merchantAmount,
    }));

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);
    const csvNoQuotes = csv.replace(/"/g, '');
    return `${csvNoQuotes}\nTotal Settled Amount,,${totalAmount}`;
    // res.header('Content-Type', 'text/csv');
    // res.attachment('transaction_report.csv');
    // res.send(`${csv}\nTotal Settled Amount,,${totalAmount}`);

    // return response;
  } catch (error: any) {
    return error;
  }
};

export { getSettlement, exportSettlement };

