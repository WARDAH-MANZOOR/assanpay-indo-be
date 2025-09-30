import { parseISO, subDays, parse, startOfDay, endOfDay } from "date-fns";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { Decimal } from "@prisma/client/runtime/library";
import { JwtPayload } from "jsonwebtoken";
import { backofficeService } from "../../services/index.js";

const merchantDashboardDetails = async (params: any, user: any) => {
  try {
    const merchantId = (user as JwtPayload)?.merchant_id || params?.merchantId;

    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }

    const currentDate = new Date();
    let filters: { merchant_id: number } = { merchant_id: merchantId };

    try {
      const startDate = params?.start?.replace(" ", "+");
      const endDate = params?.end?.replace(" ", "+");

      const customWhere = {} as any;
      let disbursement_date;
      let usdt_settlement_date;
      if (startDate && endDate) {
        const todayStart = parse(
          startDate,
          "yyyy-MM-dd'T'HH:mm:ssXXX",
          new Date()
        );
        const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

        customWhere["date_time"] = {
          gte: todayStart,
          lt: todayEnd,
        };
        disbursement_date = customWhere["date_time"]
        usdt_settlement_date = customWhere["date_time"]
      }
      console.log(customWhere)
      const fetchAggregates = [];

      // Fetch total transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            merchant_id: +merchantId,
            ...customWhere,
          },
        }) // Return type is a Promise<number>
      );

      // fetch sum of original amount from transactions
      fetchAggregates.push(
        prisma.transaction
          .aggregate({
            _sum: { original_amount: true },
            where: {
              status: "completed",
              merchant_id: +merchantId,
              ...customWhere,
            },
          })
          .catch((error: any) => {
            throw new CustomError(error?.message, 500);
          }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );
      // Set timezone
      const timeZone = 'Asia/Dhaka';

      // Get current date in the specified timezone
      const now = new Date();
      const zonedNow = toZonedTime(now, timeZone);

      // Format: 2025-07-01T00:00:00 06:00
      const todayStartLocal = `${zonedNow.getFullYear()}-${String(zonedNow.getMonth() + 1).padStart(2, '0')}-${String(zonedNow.getDate()).padStart(2, '0')}T00:00:00 06:00`.replace(" ", "+")

      // Format: 2025-07-01T23:59:59.999 06:00
      const todayEndLocal = `${zonedNow.getFullYear()}-${String(zonedNow.getMonth() + 1).padStart(2, '0')}-${String(zonedNow.getDate()).padStart(2, '0')}T23:59:59 06:00`.replace(" ", "+")
      // اردو: یہاں parse فنکشن میں پہلا آرگومنٹ string ہونا چاہیے، لیکن آپ نے Date دیا ہے۔ اس کو درست کرنے کے لیے todayStartLocal کو ISO string میں تبدیل کریں۔
      // English: The parse function expects the first argument to be a string, but you provided a Date. Convert todayStartLocal to an ISO string.

      const todayStart = parse(
        todayStartLocal,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        new Date()
      );
      const todayEnd = parse(todayEndLocal, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      console.log(todayStart, todayEnd)

      // Aggregate query
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: todayStart,
              lte: todayEnd,
            },
            merchant_id: +merchantId,
            status: 'completed',
          },
        }) as Promise<{ _sum: { original_amount: number | null } }>
      );

      // Fetch transaction status count
      fetchAggregates.push(
        prisma.transaction.groupBy({
          where: { merchant_id: +merchantId, ...customWhere },
          by: ["status"],
          _count: { status: true },
          orderBy: {
            status: "asc", // Ensure the result is ordered by status or any other field
          },
        }) // Properly type the groupBy query
      );

      fetchAggregates.push(
        prisma.transaction.findMany({
          take: 10,
          orderBy: {
            date_time: "desc",
          },
          where: {
            merchant_id: +merchantId,
            ...customWhere,
          },
        })
      );

      // count transaction of this week and last week
      const lastWeekStart = subDays(currentDate, 7);
      const lastWeekEnd = new Date(currentDate.setHours(0, 0, 0, 0)); // End of last week is start of today
      const thisWeekStart = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of this week is start of today
      const thisWeekEnd = new Date();

      // Fetch last week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: lastWeekStart,
              lt: lastWeekEnd,
            },
            merchant_id: +merchantId,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch this week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: thisWeekStart,
              lt: thisWeekEnd,
            },
            merchant_id: +merchantId,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch the sum of all jazzcash and easypaisa transactions within the customWhere range
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          _count: { original_amount: true },
          where: {
            ...customWhere,
            merchant_id: +merchantId,
            status: "completed",
            providerDetails: {
              path: ['name'],
              string_contains: 'bkash',
              mode: "insensitive"
            },
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          _count: { original_amount: true },
          where: {
            ...customWhere,
            merchant_id: +merchantId,
            status: "completed",
            providerDetails: {
              path: ['name'],
              equals: 'nagad'
            },
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      fetchAggregates.push(
        prisma.merchant.findFirst({
          where: {
            merchant_id: +merchantId,
          },
          select: {
            balanceToDisburse: true,
            disburseBalancePercent: true
          }
        })
          .then((result) => (result?.balanceToDisburse?.toNumber() || 0))  // Properly type the aggregate query
          .catch((err) => {
            console.error(err);
            throw new CustomError("Unable to get balance to disburse", 500);
          })
      );

      fetchAggregates.push(
        prisma.merchant.findFirst({
          where: {
            merchant_id: +merchantId,
          },
          select: {
            disburseBalancePercent: true
          }
        })
          .then((result) => (result?.disburseBalancePercent?.toNumber() || 0))  // Properly type the aggregate query
          .catch((err) => {
            console.error(err);
            throw new CustomError("Unable to get balance to disburse", 500);
          })
      );

      fetchAggregates.push(
        prisma.disbursement.aggregate({
          _sum: {
            transactionAmount: true,
          },
          where: {
            disbursementDate: disbursement_date,
            status: "completed",
            merchant_id: +merchantId,
          }
        })
      );

      fetchAggregates.push(
        prisma.uSDTSettlement.aggregate({
          _sum: {
            pkr_amount: true,
          },
          where: {
            date: usdt_settlement_date,
            merchant_id: +merchantId,
          }
        })
      );

      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: {
            original_amount: true
          },
          where: {
            settlement: false,
            status: 'completed',
            merchant_id: +merchantId,
            ScheduledTask: {
              status: 'pending'
            }
          }
        })
      )

      fetchAggregates.push(
        prisma.refund.aggregate({
          _sum: {
            transactionAmount: true,
          },
          where: {
            disbursementDate: disbursement_date,
            status: "completed",
            merchant_id: +merchantId,
          }
        })
      );

      // Execute all queries in parallel
      const [
        totalTransactions,
        totalIncome,
        todayIncome,
        statusCounts,
        latestTransactions,
        lastWeek,
        thisWeek,
        bkashTotal,
        nagadTotal,
        disbursementBalance,
        disburseBalancePercent,
        disbursementAmount,
        totalUsdtSettlement,
        remainingSettlements,
        totalRefund
      ] = await Promise.all(fetchAggregates);
      console.log(bkashTotal);
      console.log(nagadTotal)
      let amt = (disbursementAmount as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0
      // Build and return the full dashboard summary
      const dashboardSummary = {
        totalTransactions: totalTransactions as number, // Ensure correct type
        totalIncome:
          (totalIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        todayIncome:
          (todayIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        statusCounts: (statusCounts as any[]) || [],
        latestTransactions: latestTransactions as any,
        availableBalance: 0,
        disbursementBalance: disbursementBalance,
        disburseBalancePercent,
        disbursementAmount: amt,
        totalUsdtSettlement: (totalUsdtSettlement as { _sum: { pkr_amount: number | null } })._sum.pkr_amount || 0,
        remainingSettlements: (remainingSettlements as { _sum: { original_amount: number | null } })._sum.original_amount || 0,
        totalRefund: (totalRefund as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0,
        transactionSuccessRate: 0,
        lastWeek:
          (lastWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        thisWeek:
          (thisWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        bkashTotal:
          (bkashTotal as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        bkashCount:
          (bkashTotal as unknown as { _count: { original_amount: number | null } })._count
            ?.original_amount || 0,
        nagadTotal:
          (nagadTotal as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        nagadCount:
          (nagadTotal as unknown as { _count: { original_amount: number | null } })._count
            ?.original_amount || 0,
      };

      const walletBalance = await backofficeService.getWalletBalance(+merchantId);

      // @ts-ignore
      dashboardSummary.availableBalance = walletBalance?.walletBalance || 0;

      // Calculate the transaction success rate
      dashboardSummary.transactionSuccessRate =
        await getTransactionsSuccessRate(statusCounts);

      // make sure we sending three status always in response completed, failed, pending
      const statusTypes = ["completed", "pending", "failed"];
      // @ts-ignore
      const statusCountsMap = statusCounts.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      dashboardSummary.statusCounts = statusTypes.map((status) => ({
        status,
        count: statusCountsMap[status] || 0,
      }));

      return dashboardSummary;
    } catch (error) {
      console.error(error);
      return error;
    }
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const merchantDashboardDetailsClone = async (params: any, user: any) => {
  try {
    const merchantId = (user as JwtPayload)?.merchant_id || params?.merchantId;

    if (!merchantId) {
      throw new CustomError("Merchant ID is required", 400);
    }
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: params?.merchantId
      }
    })
    const currentDate = new Date();
    let filters: { merchant_id: number } = { merchant_id: merchantId };

    try {
      const customWhere = {} as any;
      let disbursement_date;
      let usdt_settlement_date;

      const timeZone = 'Asia/Karachi';
      const now = new Date();
      const zonedNow = toZonedTime(now, timeZone);

      const todayStartZoned = new Date(zonedNow);
      todayStartZoned.setHours(0, 0, 0, 0);

      const todayEndZoned = new Date(zonedNow);
      todayEndZoned.setHours(23, 59, 59, 999);

      // Convert back to UTC if your DB stores UTC 

      customWhere["date_time"] = {
        gte: fromZonedTime(todayStartZoned, timeZone),
        lt: fromZonedTime(todayEndZoned, timeZone),
      };

      disbursement_date = customWhere["date_time"];
      usdt_settlement_date = customWhere["date_time"];

      const fetchAggregates = [];

      // Fetch total transaction count
      fetchAggregates.push(
        prisma.transaction.count({
          where: {
            merchant_id: merchant?.merchant_id,
            ...customWhere,
          },
        }) // Return type is a Promise<number>
      );

      // fetch sum of original amount from transactions
      fetchAggregates.push(
        prisma.transaction
          .aggregate({
            _sum: { original_amount: true },
            where: {
              status: "completed",
              merchant_id: merchant?.merchant_id,
              ...customWhere,
            },
          })
          .catch((error: any) => {
            throw new CustomError(error?.message, 500);
          }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );
      //Fetch today's transaction sum

      // const servertodayStart = new Date().setHours(0, 0, 0, 0);
      // const servertodayEnd = new Date().setHours(23, 59, 59, 999);

      const date = new Date();

      // Define the Pakistan timezone
      // const timeZone = 'Asia/Karachi';

      // // Convert the date to the Pakistan timezone
      // const zonedDate = toZonedTime(date, timeZone);
      const servertodayStart = date.setHours(0, 0, 0, 0);
      const servertodayEnd = date.setHours(23, 59, 59, 999);
      console.log(date);
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: new Date(servertodayStart),
              lt: new Date(servertodayEnd),
            },
            merchant_id: merchant?.merchant_id,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch transaction status count
      fetchAggregates.push(
        prisma.transaction.groupBy({
          where: { merchant_id: merchant?.merchant_id, ...customWhere },
          by: ["status"],
          _count: { status: true },
          orderBy: {
            status: "asc", // Ensure the result is ordered by status or any other field
          },
        }) // Properly type the groupBy query
      );

      fetchAggregates.push(
        prisma.transaction.findMany({
          take: 10,
          orderBy: {
            date_time: "desc",
          },
          where: {
            merchant_id: merchant?.merchant_id,
            ...customWhere,
          },
        })
      );

      // count transaction of this week and last week
      const lastWeekStart = subDays(currentDate, 7);
      const lastWeekEnd = new Date(currentDate.setHours(0, 0, 0, 0)); // End of last week is start of today
      const thisWeekStart = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of this week is start of today
      const thisWeekEnd = new Date();

      // Fetch last week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: lastWeekStart,
              lt: lastWeekEnd,
            },
            merchant_id: merchant?.merchant_id,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch this week's transaction sum
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: thisWeekStart,
              lt: thisWeekEnd,
            },
            merchant_id: merchant?.merchant_id,
            status: "completed"
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      // Fetch the sum of all jazzcash and easypaisa transactions within the customWhere range
      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          _count: { original_amount: true },
          where: {
            ...customWhere,
            merchant_id: merchant?.merchant_id,
            status: "completed",
            providerDetails: {
              path: ['name'],
              equals: 'JazzCash'
            },
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: { original_amount: true },
          _count: { original_amount: true },
          where: {
            ...customWhere,
            merchant_id: merchant?.merchant_id,
            status: "completed",
            providerDetails: {
              path: ['name'],
              equals: 'Easypaisa'
            },
          },
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
      );

      fetchAggregates.push(
        prisma.merchant.findFirst({
          where: {
            merchant_id: merchant?.merchant_id,
          },
          select: {
            balanceToDisburse: true,
            disburseBalancePercent: true
          }
        })
          .then((result) => (result?.balanceToDisburse?.toNumber() || 0))  // Properly type the aggregate query
          .catch((err) => {
            console.error(err);
            throw new CustomError("Unable to get balance to disburse", 500);
          })
      );

      fetchAggregates.push(
        prisma.merchant.findFirst({
          where: {
            merchant_id: merchant?.merchant_id,
          },
          select: {
            disburseBalancePercent: true
          }
        })
          .then((result) => (result?.disburseBalancePercent?.toNumber() || 0))  // Properly type the aggregate query
          .catch((err) => {
            console.error(err);
            throw new CustomError("Unable to get balance to disburse", 500);
          })
      );

      fetchAggregates.push(
        prisma.disbursement.aggregate({
          _sum: {
            transactionAmount: true,
          },
          where: {
            disbursementDate: disbursement_date,
            status: "completed",
            merchant_id: merchant?.merchant_id,
          }
        })
      );

      fetchAggregates.push(
        prisma.uSDTSettlement.aggregate({
          _sum: {
            pkr_amount: true,
          },
          where: {
            date: usdt_settlement_date,
            merchant_id: merchant?.merchant_id,
          }
        })
      );

      fetchAggregates.push(
        prisma.transaction.aggregate({
          _sum: {
            original_amount: true
          },
          where: {
            settlement: false,
            status: 'completed',
            merchant_id: merchant?.merchant_id,
            ScheduledTask: {
              status: 'pending'
            }
          }
        })
      )

      fetchAggregates.push(
        prisma.refund.aggregate({
          _sum: {
            transactionAmount: true,
          },
          where: {
            disbursementDate: disbursement_date,
            status: "completed",
            merchant_id: merchant?.merchant_id,
          }
        })
      );

      // Execute all queries in parallel
      const [
        totalTransactions,
        totalIncome,
        todayIncome,
        statusCounts,
        latestTransactions,
        lastWeek,
        thisWeek,
        jazzCashTotal,
        easyPaisaTotal,
        disbursementBalance,
        disburseBalancePercent,
        disbursementAmount,
        totalUsdtSettlement,
        remainingSettlements,
        totalRefund
      ] = await Promise.all(fetchAggregates);
      let amt = (disbursementAmount as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0
      // Build and return the full dashboard summary
      const dashboardSummary = {
        totalTransactions: totalTransactions as number, // Ensure correct type
        totalIncome:
          (totalIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        todayIncome:
          (todayIncome as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        statusCounts: (statusCounts as any[]) || [],
        latestTransactions: latestTransactions as any,
        availableBalance: 0,
        disbursementBalance: disbursementBalance,
        disburseBalancePercent,
        disbursementAmount: amt,
        totalUsdtSettlement: (totalUsdtSettlement as { _sum: { pkr_amount: number | null } })._sum.pkr_amount || 0,
        remainingSettlements: (remainingSettlements as { _sum: { original_amount: number | null } })._sum.original_amount || 0,
        totalRefund: (totalRefund as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0,
        transactionSuccessRate: 0,
        lastWeek:
          (lastWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        thisWeek:
          (thisWeek as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        jazzCashTotal:
          (jazzCashTotal as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        jazzCashCount:
          (jazzCashTotal as unknown as { _count: { original_amount: number | null } })._count
            ?.original_amount || 0,
        easyPaisaTotal:
          (easyPaisaTotal as { _sum: { original_amount: number | null } })._sum
            ?.original_amount || 0,
        easyPaisaCount:
          (easyPaisaTotal as unknown as { _count: { original_amount: number | null } })._count
            ?.original_amount || 0,
      };

      const walletBalance = await backofficeService.getWalletBalance(merchant?.merchant_id as number);

      // @ts-ignore
      dashboardSummary.availableBalance = walletBalance?.walletBalance || 0;

      // Calculate the transaction success rate
      dashboardSummary.transactionSuccessRate =
        await getTransactionsSuccessRate(statusCounts);

      // make sure we sending three status always in response completed, failed, pending
      const statusTypes = ["completed", "pending", "failed"];
      // @ts-ignore
      const statusCountsMap = statusCounts.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      dashboardSummary.statusCounts = statusTypes.map((status) => ({
        status,
        count: statusCountsMap[status] || 0,
      }));

      return {...dashboardSummary, full_name: merchant?.full_name};
    } catch (error) {
      console.error(error);
      return error;
    }
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const adminDashboardDetails = async (params: any) => {
  try {
    const currentDate = new Date();
    const startDate = params?.start?.replace(" ", "+");
    const endDate = params?.end?.replace(" ", "+");

    const customWhere = {} as any;
    let disbursement_date;
    let settlement_date;
    let usdt_settlement_date;
    if (startDate && endDate) {
      const todayStart = parse(
        startDate,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        startDate
      );
      const todayEnd = parse(endDate, "yyyy-MM-dd'T'HH:mm:ssXXX", endDate);

      customWhere["date_time"] = {
        gte: todayStart,
        lt: todayEnd,
      };
      disbursement_date = customWhere["date_time"]
      settlement_date = customWhere["date_time"]
      usdt_settlement_date = customWhere["date_time"]
    }

    const fetchAggregates = [];

    // Fetch total number of merchants
    fetchAggregates.push(prisma.merchant.count());

    console.log(customWhere)
    // Fetch sum of original_amount from transactions
    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: { original_amount: true },
        where: {
          status: "completed",
          ...customWhere,
        },
      }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    // Set timezone
    const timeZone = 'Asia/Dhaka';

    // Get current date in the specified timezone
    const now = new Date();
    const zonedNow = toZonedTime(now, timeZone);

    // Format: 2025-07-01T00:00:00 06:00
    const todayStartLocal = `${zonedNow.getFullYear()}-${String(zonedNow.getMonth() + 1).padStart(2, '0')}-${String(zonedNow.getDate()).padStart(2, '0')}T00:00:00 06:00`.replace(" ", "+")

    // Format: 2025-07-01T23:59:59.999 06:00
    const todayEndLocal = `${zonedNow.getFullYear()}-${String(zonedNow.getMonth() + 1).padStart(2, '0')}-${String(zonedNow.getDate()).padStart(2, '0')}T23:59:59 06:00`.replace(" ", "+")
    // اردو: یہاں parse فنکشن میں پہلا آرگومنٹ string ہونا چاہیے، لیکن آپ نے Date دیا ہے۔ اس کو درست کرنے کے لیے todayStartLocal کو ISO string میں تبدیل کریں۔
    // English: The parse function expects the first argument to be a string, but you provided a Date. Convert todayStartLocal to an ISO string.

    const todayStart = parse(
      todayStartLocal,
      "yyyy-MM-dd'T'HH:mm:ssXXX",
      new Date()
    );
    const todayEnd = parse(todayEndLocal, "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

    console.log(todayStart, todayEnd)
    // Fetch sum of original_amount from today's transactions
    fetchAggregates.push(
      prisma.transaction
        .aggregate({
          _sum: { original_amount: true },
          where: {
            date_time: {
              gte: todayStart,
              lte: todayEnd,
            },
            status: "completed",
          },
        })
        .catch((error: any) => {
          throw new CustomError(error?.message, 500);
        }) as Promise<{ _sum: { original_amount: number | null } }> // Properly type the aggregate query
    );

    // bring latest 10 transactions
    fetchAggregates.push(
      prisma.transaction.findMany({
        take: 10,
        orderBy: {
          date_time: "desc",
        },
        where: {
          ...customWhere,
        },
        include: {
          Provider: true
        }
      })
    );

    fetchAggregates.push(
      prisma.merchant.aggregate({
        _sum: {
          balanceToDisburse: true
        }
      })
    );

    fetchAggregates.push(
      prisma.disbursement.aggregate({
        _sum: {
          transactionAmount: true,
        },
        where: {
          disbursementDate: disbursement_date,
          status: "completed",
        }
      })
    );

    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: {
          balance: true
        },
        where: {
          settlement: true,
          balance: { gt: new Decimal(0) },
          status: "completed"
        },
      })
    );

    fetchAggregates.push(
      prisma.settlementReport.aggregate({
        _sum: {
          merchantAmount: true
        },
        where: {
          settlementDate: settlement_date,
        }
      })
    );

    fetchAggregates.push(
      prisma.uSDTSettlement.aggregate({
        _sum: {
          pkr_amount: true,
        },
        where: {
          date: usdt_settlement_date,
        }
      })
    );

    fetchAggregates.push(
      prisma.transaction.aggregate({
        _sum: {
          original_amount: true
        },
        where: {
          settlement: false,
          status: 'completed',
          ScheduledTask: {
            status: 'pending'
          }
        }
      })
    )

    fetchAggregates.push(
      prisma.refund.aggregate({
        _sum: {
          transactionAmount: true,
        },
        where: {
          disbursementDate: disbursement_date,
          status: "completed",
        }
      })
    );

    // Execute all queries in parallel
    const [totalMerchants, totalIncome, todayIncome, latestTransactions, totalBalanceToDisburse, totalDisbursmentAmount, totalSettlementBalance, totalSettlementAmount, totalUsdtSettlement, remainingSettlements, totalRefund] =
      await Promise.all(fetchAggregates);

    // Build and return the full dashboard summary
    const dashboardSummary = {
      totalMerchants: totalMerchants as number, // Ensure correct type
      totalIncome:
        (totalIncome as { _sum: { original_amount: number | null } })._sum
          ?.original_amount || 0,
      todayIncome:
        (todayIncome as { _sum: { original_amount: number | null } })._sum
          ?.original_amount || 0,
      latestTransactions: latestTransactions as any,
      totalBalanceToDisburse: (totalBalanceToDisburse as { _sum: { balanceToDisburse: number | null } })._sum.balanceToDisburse || 0,
      totalDisbursmentAmount: (totalDisbursmentAmount as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0,
      totalSettlementBalance: (totalSettlementBalance as { _sum: { balance: number | null } })._sum.balance?.toFixed(2) || 0,
      totalSettlementAmount: (totalSettlementAmount as { _sum: { merchantAmount: number | null } })._sum.merchantAmount?.toFixed(2) || 0,
      totalUsdtSettlement: (totalUsdtSettlement as { _sum: { pkr_amount: number | null } })._sum.pkr_amount || 0,
      remainingSettlements: (remainingSettlements as { _sum: { original_amount: number | null } })._sum.original_amount || 0,
      totalRefund: (totalRefund as { _sum: { transactionAmount: number | null } })._sum.transactionAmount?.toFixed(2) || 0
    };

    return dashboardSummary;
  } catch (error: any) {
    throw new CustomError(error?.error, error?.statusCode);
  }
};

const getTransactionsSuccessRate = async (statusCounts: any) => {
  // On Basis of statusCounts generate a transaction success rate
  // 1. Find the total number of transactions
  const totalTransactions = statusCounts.reduce(
    (acc: number, item: any) => acc + item._count.status,
    0
  );

  // 2. Find the number of successful transactions
  const successfulTransactions = statusCounts.find(
    (item: any) => item.status === "completed"
  )?._count.status;

  // 3. Calculate the success rate

  return totalTransactions
    ? ((successfulTransactions || 0) / totalTransactions) * 100
    : 0;
};

export default {
  merchantDashboardDetails,
  adminDashboardDetails,
  merchantDashboardDetailsClone
};
