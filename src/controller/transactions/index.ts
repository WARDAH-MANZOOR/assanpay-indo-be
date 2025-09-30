// src/controllers/paymentController.ts
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse.js";
import {
  getAllProfitsBalancesByMerchant,
  getProfitAndBalance,
} from "@prisma/client/sql";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import { getDateRange } from "../../utils/date_method.js";
import { addHours, parse, subMinutes } from "date-fns";

import analytics from "./analytics.js";
import { Parser } from "json2csv";
import { JsonObject } from "@prisma/client/runtime/library";
import { format, toZonedTime } from "date-fns-tz";

const getTransactions = async (req: Request, res: Response) => {
  try {
    console.log(req.user)
    const merchantId = (req.user as JwtPayload)?.merchant_id || req.query?.merchantId;
    const { transactionId, merchantName, merchantTransactionId, response_message } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;

    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    if (response_message) {
      customWhere.AND.push({
        response_message: {
          contains: response_message
        }
      });
    }

    let { page, limit } = req.query;
    // Query based on provided parameters
    let skip, take = 0;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const transactions = await prisma.transaction.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take + 1 }),
      where: {
        ...(transactionId && { transaction_id: transactionId as string }),
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...(merchantName && {
          merchant: {
            username: merchantName as string,
          },
        }),
        ...customWhere,
      },
      orderBy: {
        date_time: "desc",
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    payinxMerchant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = transactions.length > take;
    console.log(hasMore, take, transactions.length)
    if (hasMore) {
      transactions.pop(); // Remove the extra record
    }

    // Build meta with hasMore flag
    const meta = {
      page: page ? parseInt(page as string) : 1,
      limit: take,
      hasMore,
    };

    const response = {
      transactions: transactions?.map((transaction) => {
          const adjustedDate = addHours(transaction?.date_time, 1);
          return {
              ...transaction,
              payinxMerchant: transaction.merchant,
              date_time: format(adjustedDate, 'yyyy-MM-dd HH:mm:ss'),
          };
      }),
      meta,
  };

    res.status(200).json(response);
  } catch (err) {
    console.log(err)
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

const getTeleTransactions = async (req: Request, res: Response) => {
  try {
    console.log(req.user)
    const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;
    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    if (response_message) {
      customWhere.AND.push({
        response_message: {
          contains: response_message
        }
      });
    }
    let { page, limit } = req.query;
    // Query based on provided parameters
    let skip, take;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }
    const transactions = await prisma.transaction.findMany({
      ...(skip && { skip: +skip }),
      ...(take && { take: +take }),
      where: {
        ...(transactionId && { transaction_id: transactionId as string }),
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...(merchantName && {
          merchant: {
            username: merchantName as string,
          },
        }),
        ...customWhere,
      },
      orderBy: {
        date_time: "desc",
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    payinxMerchant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let meta = {};
    if (page && take) {
      // Get the total count of transactions
      const total = await prisma.transaction.count(
        {
          where: {
            ...(transactionId && { transaction_id: transactionId as string }),
            ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
            ...(merchantName && {
              merchant: {
                username: merchantName as string,
              },
            }),
            ...customWhere,
          }
        }
      );
      // Calculate the total number of pages
      const pages = Math.ceil(total / +take);
      meta = {
        total,
        pages,
        page: parseInt(page as string),
        limit: take
      }
    }
    const response = {
      transactions: transactions.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant.groups[0]?.merchant?.payinxMerchant,
      })),
      meta,
    };

    res.status(200).json(response);
  } catch (err) {
    console.log(err)
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

const getTeleTransactionsLast15Mins = async (req: Request, res: Response) => {
  try {
    const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;
    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    if (response_message) {
      customWhere.AND.push({
        response_message: {
          contains: response_message
        }
      });
    }

    if (merchantId) {
      customWhere["merchant_id"] = Number(merchantId);
    }
    const timezone = 'Asia/Karachi';
    const currentTime = toZonedTime(new Date(), timezone);
    const fifteenMinutesAgo = subMinutes(currentTime, 15);

    const transactions = await prisma.transaction.findMany({
      where: {
        ...customWhere,
        date_time: {
          gte: fifteenMinutesAgo,
          lte: currentTime,
        },
      },
      orderBy: {
        date_time: 'desc',
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    payinxMerchant: true,
                  },
                },
              },
            },
          },
        }
      }
    });

    res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTeleTransactionsLast4Mins = async (req: Request, res: Response) => {
  try {
    const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;
    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    if (response_message) {
      customWhere.AND.push({
        response_message: {
          contains: response_message
        }
      });
    }

    if (merchantId) {
      customWhere["merchant_id"] = Number(merchantId);
    }
    const timezone = 'Asia/Karachi';
    const currentTime = toZonedTime(new Date(), timezone);
    const twoMinutesAgo = subMinutes(currentTime, 4);

    const transactions = await prisma.transaction.findMany({
      where: {
        ...customWhere,
        date_time: {
          gte: twoMinutesAgo,
          lte: currentTime,
        },
      },
      orderBy: {
        date_time: 'desc',
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    payinxMerchant: true,
                  },
                },
              },
            },
          },
        }
      }
    });

    res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTeleTransactionsLast15MinsFromLast3Mins = async (req: Request, res: Response) => {
  try {
    const { merchantId, transactionId, merchantName, merchantTransactionId, response_message } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;
    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    if (response_message) {
      customWhere.AND.push({
        response_message: {
          contains: response_message
        }
      });
    }

    if (merchantId) {
      customWhere["merchant_id"] = Number(merchantId);
    }
    const timezone = 'Asia/Karachi';
    const currentTime = toZonedTime(new Date(), timezone);
    const fifteenMinutesAgo = subMinutes(currentTime, 15);
    const threeMinutesAgo = subMinutes(currentTime, 3);

    const transactions = await prisma.transaction.findMany({
      where: {
        ...customWhere,
        date_time: {
          gte: fifteenMinutesAgo,
          lte: threeMinutesAgo,
        },
      },
      orderBy: {
        date_time: 'desc',
      },
      include: {
        merchant: {
          include: {
            groups: {
              include: {
                merchant: {
                  include: {
                    payinxMerchant: true,
                  },
                },
              },
            },
          },
        }
      }
    });

    res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const exportTransactions = async (req: Request, res: Response) => {
  try {
    const merchantId = (req.user as JwtPayload)?.merchant_id || req.query?.merchantId;
    const { transactionId, merchantName, merchantTransactionId } = req.query;

    let startDate = req.query?.start as string;
    let endDate = req.query?.end as string;
    const status = req.query?.status as string;
    const search = req.query?.search || "" as string;
    const msisdn = req.query?.msisdn || "" as string;
    const provider = req.query?.provider || "" as string;
    const customWhere = { AND: [] } as any;

    if (startDate && endDate) {
      const todayStart = parse(startDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());
      const todayEnd = parse(endDate.replace(" ", "+"), "yyyy-MM-dd'T'HH:mm:ssXXX", new Date());

      customWhere.AND.push({
        date_time: {
          gte: todayStart,
          lt: todayEnd,
        }
      });
    }

    if (status) {
      customWhere.AND.push({ status });
    }

    if (search) {
      customWhere.AND.push({
        transaction_id: {
          contains: search
        }
      });
    }

    if (msisdn) {
      customWhere.AND.push({
        providerDetails: {
          path: ['msisdn'],
          equals: msisdn
        }
      });
    }

    if (provider) {
      customWhere.AND.push({
        providerDetails: {
          path: ['name'],
          equals: provider
        }
      });
    }

    if (merchantTransactionId) {
      customWhere.AND.push({
        merchant_transaction_id: merchantTransactionId
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(transactionId && { transaction_id: transactionId as string }),
        ...(merchantId && { merchant_id: parseInt(merchantId as string) }),
        ...(merchantName && {
          merchant: {
            username: merchantName as string,
          },
        }),
        ...customWhere,
      },
      orderBy: {
        date_time: "desc",
      },
    });

    const totalAmount = transactions.reduce((sum, transaction) => sum + Number(transaction.settled_amount), 0);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

    const fields = [
      'transaction_id',
      'account',
      'merchant_transaction_id',
      'date_time',
      'original_amount',
      'commission',
      'settled_amount',
      'status',
      'type',
      'provider',
      'callback_sent',
      'response_message'
    ];
    const timeZone = "Asia/Karachi"
    const data = transactions.map(transaction => ({
      transaction_id: transaction.transaction_id,
      account: (transaction.providerDetails as JsonObject)?.msisdn,
      merchant_transaction_id: transaction.merchant_transaction_id,
      date_time: format(
        toZonedTime(transaction.date_time, timeZone),
        'yyyy-MM-dd HH:mm:ss', { timeZone }
      ),
      original_amount: transaction.original_amount,
      commission: Number(transaction.original_amount) - Number(transaction.settled_amount),
      settled_amount: transaction.settled_amount,
      response_message: transaction.response_message,
      status: transaction.status,
      type: transaction.type,
      provider: (transaction.providerDetails as JsonObject)?.name,
      callback_sent: transaction.callback_sent
    }));

    const json2csvParser = new Parser({ fields, quote: '' });
    const csv = json2csvParser.parse(data);
    const csvNoQuotes = csv.replace(/"/g, '');

    res.header('Content-Type', 'text/csv');
    res.attachment('transaction_report.csv');
    res.send(`${csvNoQuotes}\nTotal Settled Amount,,${totalAmount}`);
  } catch (err) {
    console.error(err);
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

const getProAndBal = async (req: Request, res: Response) => {
  try {
    const { merchantId, startDate, endDate, range } = req.query;

    // Get date range based on the query parameters (defaulting to the full range if not provided)
    const { fromDate, toDate } = getDateRange(
      range as string,
      startDate as string,
      endDate as string
    );

    // Raw SQL query based on whether `merchantId` is provided or not
    const profitAndBalanceQuery = merchantId
      ? getAllProfitsBalancesByMerchant(
        fromDate,
        toDate,
        parseInt(merchantId as string)
      )
      : getProfitAndBalance(fromDate, toDate);

    const merchantsBalanceProfit = await prisma.$queryRawTyped(
      profitAndBalanceQuery
    );

    res.status(200).json(merchantsBalanceProfit);
  } catch (err) {
    console.log(err);
    const error = new CustomError("Internal Server Error", 500);
    res.status(500).send(error);
  }
};

export default {
  getTransactions,
  getProAndBal,
  exportTransactions,
  getTeleTransactions,
  getTeleTransactionsLast15Mins,
  getTeleTransactionsLast4Mins,
  getTeleTransactionsLast15MinsFromLast3Mins,
  ...analytics,
};


// ...(skip && { skip: +skip }),
//       ...(take && { take: +take }),
