import { getTransactionsDaywise } from "@prisma/client/sql";
import { parseISO, subDays } from "date-fns";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";

const filterTransactions = async (params: any, user: any) => {
  const { transactionId, date, startDate, endDate, status, groupByDay } =
    params;

  let filter: any = { merchant_id: user?.id };

  if (transactionId) filter.transaction_id = transactionId as string;
  if (date)
    filter.date_time = {
      gte: parseISO(date as string),
      lte: parseISO(date as string),
    };
  if (startDate && endDate)
    filter.date_time = {
      gte: parseISO(startDate as string),
      lte: parseISO(endDate as string),
    };
  if (status) filter.status = status as string;

  try {
    if (groupByDay === "true") {
      // Group by day
      const transactions = await prisma.$queryRawTyped(
        getTransactionsDaywise(user?.id)
      );
      return transactions;
    }

    const transactions = await prisma.transaction.findMany({
      where: filter,
      select: {
        date_time: true,
        settled_amount: true,
        status: true,
        response_message: true,
        transaction_id: true,
      },
    });

    return transactions;
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getDashboardSummary = async (params: any) => {

};

const getCustomerTransactions = async (params: any) => {
  try {
    console.log(params.id);
    const transactions = await prisma.transaction.findMany({
      where: {
        customer_id: params.id,
      }
    });
    return transactions;
  }
  catch (err) {
    throw new CustomError("Internal Server Error", 500);
  }
}


export default { filterTransactions, getDashboardSummary, getCustomerTransactions };
