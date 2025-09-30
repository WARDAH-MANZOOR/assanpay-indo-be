import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import { parse, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface TransactionSummary {
  shamimTransactions: {
    count: number;
    totalAmount: number;
    bkashAmount: number;
    nagadAmount: number;
  };
  bkashDirectTransactions: {
    count: number;
    totalAmount: number;
    bkashAmount: number;
    nagadAmount: number;
  };
  shurjopayTransactions: {
    count: number;
    totalAmount: number;
    bkashAmount: number;
    nagadAmount: number;
  };
  shahadatTransactions: {
    count: number;
    totalAmount: number;
    bkashAmount: number;
    nagadAmount: number;
  };
  grandTotal: {
    count: number;
    totalAmount: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const getTransactionSummary = async (params: {
  startDate?: string;
  endDate?: string;
  merchantId?: number;
}): Promise<TransactionSummary> => {
  try {
    const { startDate, endDate, merchantId } = params;
    
    let dateFilter: any = {};
    
    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        startDate
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", endDate);

      dateFilter = {
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      };
    } else if (startDate) {
      // If only start date is provided, get data for that specific date
      const start = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const startOfDayDate = startOfDay(start);
      const endOfDayDate = endOfDay(start);
      
      dateFilter = {
        date_time: {
          gte: startOfDayDate,
          lt: endOfDayDate,
        }
      };
    }

    // Base where clause - only completed transactions
    const baseWhere = {
      status: 'completed', // Only successful transactions
      ...(merchantId && { merchant_id: merchantId }),
      ...dateFilter,
    };

    // Get all completed transactions in the date range
    const transactions = await prisma.transaction.findMany({
      where: baseWhere,
      select: {
        transaction_id: true,
        original_amount: true,
        providerDetails: true,
        status: true,
        date_time: true,
      },
    });


    // Initialize summary object
    const summary: TransactionSummary = {
      shamimTransactions: { count: 0, totalAmount: 0, bkashAmount: 0, nagadAmount: 0 },
      bkashDirectTransactions: { count: 0, totalAmount: 0, bkashAmount: 0, nagadAmount: 0 },
      shurjopayTransactions: { count: 0, totalAmount: 0, bkashAmount: 0, nagadAmount: 0 },
      shahadatTransactions: { count: 0, totalAmount: 0, bkashAmount: 0, nagadAmount: 0 },
      grandTotal: { count: 0, totalAmount: 0 },
      dateRange: {
        startDate: startDate || '',
        endDate: endDate || '',
      },
    };

    // Process each transaction
    transactions.forEach((transaction) => {
      const amount = Number(transaction.original_amount) || 0;
      const transactionId = transaction.transaction_id;
      const providerDetails = transaction.providerDetails as any;

      // Check if transaction is Bkash or Nagad
      const isBkash = providerDetails?.name === 'Bkash' || providerDetails?.name === 'bkash';
      const isNagad = providerDetails?.name === 'Nagad' || providerDetails?.name === 'nagad';

      // Categorize by transaction ID prefix and track provider amounts
      if (transactionId.startsWith('T')) {
        summary.shamimTransactions.count++;
        summary.shamimTransactions.totalAmount += amount;
        if (isBkash) summary.shamimTransactions.bkashAmount += amount;
        if (isNagad) summary.shamimTransactions.nagadAmount += amount;
      } else if (transactionId.startsWith('BK')) {
        summary.bkashDirectTransactions.count++;
        summary.bkashDirectTransactions.totalAmount += amount;
        if (isBkash) summary.bkashDirectTransactions.bkashAmount += amount;
        if (isNagad) summary.bkashDirectTransactions.nagadAmount += amount;
      } else if (transactionId.startsWith('SP')) {
        summary.shurjopayTransactions.count++;
        summary.shurjopayTransactions.totalAmount += amount;
        if (isBkash) summary.shurjopayTransactions.bkashAmount += amount;
        if (isNagad) summary.shurjopayTransactions.nagadAmount += amount;
      } else if (transactionId.startsWith('DEV')) {
        summary.shahadatTransactions.count++;
        summary.shahadatTransactions.totalAmount += amount;
        if (isBkash) summary.shahadatTransactions.bkashAmount += amount;
        if (isNagad) summary.shahadatTransactions.nagadAmount += amount;
      }

      // Add to grand total
      summary.grandTotal.count++;
      summary.grandTotal.totalAmount += amount;
    });

    return summary;
  } catch (error: any) {
    console.error('Error in getTransactionSummary:', error);
    throw new CustomError(error?.message || 'Failed to get transaction summary', 500);
  }
};

export default {
  getTransactionSummary,
};
