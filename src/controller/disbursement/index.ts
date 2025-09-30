import { addHours, parseISO } from "date-fns";
import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse.js";
import { format, toZonedTime } from "date-fns-tz";
import { Parser } from "json2csv";
import { Decimal } from "@prisma/client/runtime/library";

const getDisbursement = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req;
        const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
        const startDate = (query?.start as string)?.replace(" ", "+");
        const endDate = (query?.end as string)?.replace(" ", "+");

        const customWhere = {
            deletedAt: null,
        } as any;

        if (id) {
            customWhere["merchant_id"] = +id;
        }

        if (query.account) {
            customWhere["account"] = {
                contains: query.account
            };
        }

        if (query.transaction_id) {
            customWhere["transaction_id"] = query.transaction_id
        }

        if (startDate && endDate) {
            const todayStart = parseISO(startDate as string);
            const todayEnd = parseISO(endDate as string);

            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        if (query.merchantTransactionId) {
            customWhere["merchant_custom_order_id"] = query.merchantTransactionId
        }

        if (query.status) {
            customWhere["status"] = query.status;
        }
        let { page, limit } = query;
        // Query based on provided parameters
        let skip, take = 0;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }

        const disbursements = await prisma?.disbursement
            .findMany({
                ...(skip && { skip: +skip }),
                ...(take && { take: +take + 1 }),
                where: {
                    ...customWhere,

                },
                orderBy: {
                    disbursementDate: "desc",
                },
                include: {
                    merchant: {
                        select: {
                            uid: true,
                            full_name: true,
                        },
                    },
                },
            })
            .catch((err) => {
                throw new Error("Unable to get disbursement history");
            });

        // loop through disbursements and add transaction details
        // for (let i = 0; i < disbursements.length; i++) {
        //   if (!disbursements[i].transaction_id) {
        //     disbursements[i].transaction = null;
        //   } else {
        //     const transaction = await prisma.transaction.findFirst({
        //       where: {
        //         transaction_id: disbursements[i].transaction_id,
        //       },
        //     });
        //     disbursements[i].transaction = transaction;
        //   }
        // }
        let hasMore = false;
        console.log(disbursements?.length, take)
        if (take > 0) {
            hasMore = (disbursements?.length as number) > take;
            if (hasMore) {
                disbursements?.pop(); // Remove the extra record
            }
        }

        // Build meta with hasMore flag
        const meta = {
            page: page ? parseInt(page as string) : 1,
            limit: take,
            hasMore,
        };

        const response = {
            transactions: disbursements?.map((transaction) => {
                const adjustedDate = addHours(transaction.disbursementDate, 1);
                return {
                    ...transaction,
                    payinxMerchant: transaction.merchant,
                    disbursementDate: format(adjustedDate, 'yyyy-MM-dd HH:mm:ss'),
                };
            }),
            meta,
        };
        console.log(response)
        res.status(200).json(ApiResponse.success(response));
    } catch (error: any) {
        res.status(500).json({ "status": "error", "message": error?.message });
    }
}

const getTeleDisbursement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
    const startDate = (query?.start as string)?.replace(" ", "+");
    const endDate = (query?.end as string)?.replace(" ", "+");

    const customWhere = {
      deletedAt: null,
    } as any;

    if (id) {
      customWhere["merchant_id"] = +id;
    }

    if (query.account) {
      customWhere["account"] = {
        contains: query.account,
      };
    }

    if (query.transaction_id) {
      customWhere["transaction_id"] = query.transaction_id;
    }

    if (startDate && endDate) {
      const todayStart = parseISO(startDate as string);
      const todayEnd = parseISO(endDate as string);

      customWhere["disbursementDate"] = {
        gte: todayStart,
        lt: todayEnd,
      };
    }

    if (query.merchantTransactionId) {
      customWhere["merchant_custom_order_id"] = query.merchantTransactionId;
    }

    if (query.status) {
      customWhere["status"] = query.status;
    }

    let { page, limit } = query;
    let skip, take;
    if (page && limit) {
      skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
      take = parseInt(limit as string);
    }

    const disbursements = await prisma?.disbursement
      .findMany({
        ...(skip && { skip: +skip }),
        ...(take && { take: +take }),
        where: {
          ...customWhere,
        },
        orderBy: {
          disbursementDate: "desc",
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
      })
      .catch((err) => {
        throw new Error("Unable to get disbursement history");
      });

    let meta = {};
    if (page && take) {
      const total = await prisma?.disbursement.count({
        where: {
          ...customWhere,
        },
      });
      const pages = Math.ceil((total as number) / +take);
      meta = {
        total,
        pages,
        page: parseInt(page as string),
        limit: take,
      };
    }

    const response = {
      transactions: disbursements?.map((transaction) => ({
        ...transaction,
        jazzCashMerchant: transaction.merchant.groups[0]?.merchant?.payinxMerchant,
        disbursementDate: format(transaction.disbursementDate, 'yyyy-MM-dd HH:mm:ss'),
      })),
      meta,
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error?.message });
  }
};
const exportDisbursement = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req;
        const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
        const startDate = (query?.start as string)?.replace(" ", "+");
        const endDate = (query?.end as string)?.replace(" ", "+");

        const customWhere = {
            deletedAt: null,
        } as any;

        if (id) {
            customWhere["merchant_id"] = +id;
        }

        if (query.account) {
            customWhere["account"] = {
                contains: query.account
            };
        }

        if (query.transaction_id) {
            customWhere["transaction_id"] = query.transaction_id
        }

        if (startDate && endDate) {
            const todayStart = parseISO(startDate as string);
            const todayEnd = parseISO(endDate as string);

            customWhere["disbursementDate"] = {
                gte: todayStart,
                lt: todayEnd,
            };
        }

        if (query.merchantTransactionId) {
            customWhere["merchant_custom_order_id"] = query.merchantTransactionId
        }

        if (query.status) {
            customWhere["status"] = query.status;
        }

        const disbursements = await prisma?.disbursement
            .findMany({
                where: {
                    ...customWhere,
                },
                orderBy: {
                    disbursementDate: "desc",
                },
                include: {
                    merchant: {
                        select: {
                            uid: true,
                            full_name: true,
                        },
                    },
                },
            })
            .catch((err) => {
                throw new Error("Unable to get disbursement history");
            });

        const totalAmount = disbursements?.reduce((sum, transaction) => sum + Number(transaction.merchantAmount), 0);

        // res.setHeader('Content-Type', 'text/csv');
        // res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');

        const fields = [
            'merchant',
            'account',
            'transaction_id',
            'merchant_order_id',
            'disbursement_date',
            'transaction_amount',
            'commission',
            'gst',
            'withholding_tax',
            'merchant_amount',
            'status',
            'provider',
            'callback_sent'
        ];

        const timeZone = 'Asia/Karachi'
        const data = disbursements?.map(transaction => ({
            merchant: transaction.merchant.full_name,
            account: transaction.account,
            transaction_id: transaction.transaction_id,
            merchant_order_id: transaction.merchant_custom_order_id,
            disbursement_date: format(
                toZonedTime(transaction.disbursementDate, timeZone),
                'yyyy-MM-dd HH:mm:ss', { timeZone }
            ),
            transaction_amount: transaction.transactionAmount,
            commission: transaction.commission,
            gst: transaction.gst,
            withholding_tax: transaction.withholdingTax,
            merchant_amount: transaction.merchantAmount,
            status: transaction.status,
            provider: transaction.provider,
            callback_sent: transaction.callback_sent
        }));

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data || []);
        const csvNoQuotes = csv.replace(/"/g, '');

        const merchant = `${csvNoQuotes}\nTotal Settled Amount,,${totalAmount}`;
        // loop through disbursements and add transaction details
        // for (let i = 0; i < disbursements.length; i++) {
        //   if (!disbursements[i].transaction_id) {
        //     disbursements[i].transaction = null;
        //   } else {
        //     const transaction = await prisma.transaction.findFirst({
        //       where: {
        //         transaction_id: disbursements[i].transaction_id,
        //       },
        //     });
        //     disbursements[i].transaction = transaction;
        //   }
        // }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(merchant);
    } catch (error: any) {
        res.status(400).json({ status: "error", message: error?.message })
    }
}

const getAllMerchantsWalletBalancesController = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.time("getAllMerchantsWalletBalances");

        const { startDate, endDate } = req.query;
        const start = startDate ? new Date(startDate as string) : null;
        const end = endDate ? new Date(endDate as string) : null;

        const [merchants, allWalletBalances] = await Promise.all([
            prisma?.merchant.findMany({
                select: {
                    merchant_id: true,
                    uid: true,
                    user_id: true,
                    full_name: true,
                    company_name: true,
                },
            }),
            prisma?.transaction?.groupBy({
                by: ["merchant_id"],
                where: {
                    settlement: true,
                    status: "completed",
                    balance: { gt: new Decimal(0) },
                    ...(start && end
                        ? {
                            date_time: {
                                gte: start,
                                lte: end,
                            },
                        }
                        : {}),
                },
                _sum: { balance: true },
            }),
        ]);

        const walletMap = new Map(
            allWalletBalances?.map((b) => [b.merchant_id, b._sum.balance?.toNumber() || 0])
        );

        const balances = merchants?.map((merchant) => ({
            merchantId: merchant.merchant_id,
            uid: merchant.uid,
            userId: merchant.user_id,
            UserName: merchant.full_name,
            companyName: merchant.company_name,
            walletBalance: walletMap.get(merchant.merchant_id) || 0, // always assign to `walletBalance`
        }));

        balances?.sort((a, b) => b.walletBalance - a.walletBalance);

        console.timeEnd("getAllMerchantsWalletBalances");

        res.status(200).json(ApiResponse.success(balances));
    } catch (error) {
        next(error);
    }
};

const checkMerchantExistsWithKey = async (merchantId: string): Promise<boolean> => {
    const user = await prisma?.merchant.findMany({
        where: { uid: merchantId },
    });

    return Boolean(user?.length == 1);
};

const getDisbursementBalanceControllerWithKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const merchantId = req.params.merchantId;
    if (!merchantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        //   const balance: any = await getDisbursementBalanceWithKey(merchantId);
        // Check if the merchant exists
        const merchantExists = await checkMerchantExistsWithKey(merchantId);
        if (!merchantExists) {
            throw new Error('Merchant not found');
        }
        console.log(merchantId)
        // Calculate and return the wallet balance
        const walletBalance = await prisma?.merchant.findFirst({
            where: {
                uid: merchantId,
            },
            select: {
                balanceToDisburse: true,
            }
        });

        if (walletBalance === null) {
            throw new Error('Wallet balance not found');
        }

        console.log(walletBalance);
        res.status(200).json(ApiResponse.success({ ...walletBalance }));
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
};

const calculateWalletBalanceWithKey = async (merchantId: string): Promise<Object> => {
    const merchant = await prisma?.merchant.findFirst({
        where: { uid: merchantId },
    })
    const result = await prisma?.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
            status: 'completed'
        },
    });

    // Find the todays transaction sum
    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);

    const todayResult = await prisma?.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchant?.merchant_id,
            date_time: {
                gte: new Date(servertodayStart),
                lt: new Date(servertodayEnd),
            },
        },
    });
    const walletBalance = result?._sum.balance || new Decimal(0);
    const todayBalance = todayResult?._sum.balance || new Decimal(0);
    return {
        walletBalance: walletBalance.toNumber(),
        todayBalance: todayBalance.toNumber(),
    };
};
const getWalletBalanceControllerWithKey = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const merchantId = req.params.merchantId;
    if (!merchantId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Check if the merchant exists
    const merchantExists = await checkMerchantExistsWithKey(merchantId);
    if (!merchantExists) {
        throw new Error('Merchant not found');
    }

    // Calculate and return the wallet balance
    const walletBalance = await calculateWalletBalanceWithKey(merchantId);
    res.status(200).json(ApiResponse.success({ ...walletBalance }));
};

export default {
    getDisbursement,
    getTeleDisbursement,
    exportDisbursement,
    getAllMerchantsWalletBalancesController,
    getDisbursementBalanceControllerWithKey,
    getWalletBalanceControllerWithKey
}