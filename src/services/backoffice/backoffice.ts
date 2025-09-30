import { PrismaClient } from '@prisma/client';
import { Decimal, JsonObject } from '@prisma/client/runtime/library';
import { endOfDay, format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { dashboardService, transactionService } from '../../services/index.js';
import CustomError from '../../utils/custom_error.js';
import { addWeekdays } from '../../utils/date_method.js';
const prisma = new PrismaClient();

interface CalculatedFinancials {
    totalIncome: number | Decimal;
    remainingSettlements: number | Decimal;
    availableBalance: number | Decimal;
    disbursementBalance: number | Decimal;
    disbursementAmount: number | Decimal;
    totalUsdtSettlement: number | Decimal;
    totalRefund: number | Decimal;
    settled: Decimal;
    payinCommission: Decimal;
    settledBalance: Decimal;
    payoutCommission: Decimal;
    totalDisbursement: Decimal;
    disbursementSum: Decimal;
    difference: Decimal;
    differenceInSettlements: Decimal;
}

interface MerchantDashboardData {
    totalIncome: number;
    remainingSettlements: number;
    availableBalance: number;
    disbursementBalance: number;
    disbursementAmount: number;
    totalUsdtSettlement: number;
    totalRefund: number;
}

const checkMerchantExists = async (merchantId: number): Promise<boolean> => {
    const merchant = await prisma.user.findUnique({
        where: { id: merchantId },
    });
    return Boolean(merchant);
};

const calculateWalletBalance = async (merchantId: number): Promise<Object> => {
    const result = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchantId,
            status: 'completed',
        },
    });

    // Find the todays transaction sum
    const servertodayStart = new Date().setHours(0, 0, 0, 0);
    const servertodayEnd = new Date().setHours(23, 59, 59, 999);

    const todayResult = await prisma.transaction.aggregate({
        _sum: {
            balance: true,
        },
        where: {
            settlement: true,
            balance: { gt: new Decimal(0) },
            merchant_id: merchantId,
            date_time: {
                gte: new Date(servertodayStart),
                lt: new Date(servertodayEnd),
            },
        },
    });
    const walletBalance = result._sum.balance || new Decimal(0);
    const todayBalance = todayResult._sum.balance || new Decimal(0);
    return {
        walletBalance: walletBalance.toNumber(),
        todayBalance: todayBalance.toNumber(),
    };
};

const getWalletBalance = async (merchantId: number): Promise<Object> => {
    try {
        // Check if the merchant exists
        const merchantExists = await checkMerchantExists(merchantId);
        if (!merchantExists) {
            throw new CustomError('Merchant not found', 404);
        }

        // Calculate and return the wallet balance
        const walletBalance = await calculateWalletBalance(merchantId);
        return walletBalance;
    } catch (error) {
        if (error instanceof CustomError) {
            throw error; // Re-throw custom errors with proper status codes
        }
        console.error('Error fetching wallet balance:', error);
        throw new CustomError('Unable to fetch wallet balance', 500);
    }
};

// Delete all finance data for a merchant
async function removeMerchantFinanceData(merchantId: number) {
    try {
        // Delete from ScheduledTask
        await prisma.scheduledTask.deleteMany({
            where: {
                transactionId: {
                    in: (await prisma.transaction.findMany({
                        where: { merchant_id: merchantId },
                        select: { transaction_id: true },
                    })).map((obj) => obj.transaction_id),
                },
            },
        });

        // Delete from SettlementReport
        await prisma.settlementReport.deleteMany({ where: { merchant_id: merchantId } });

        // Delete from Disbursement
        await prisma.disbursement.deleteMany({ where: { merchant_id: merchantId } });

        // Delete Transactions
        await prisma.transaction.deleteMany({ where: { merchant_id: merchantId } });

        return 'Merchant finance data removed successfully.';
    } catch (error) {
        throw new CustomError('Error removing merchant finance data', 500);
    }
}

async function zeroMerchantWalletBalance(merchantId: number) {
    try {
        await prisma.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                status: 'completed',
            },
            data: {
                balance: 0,
            },
        });

        return 'Wallet balance zeroed successfully.';
    } catch (error) {
        throw new CustomError('Error zeroing wallet balance', 500);
    }
}

async function adjustMerchantWalletBalance(merchantId: number, targetBalance: number, record: boolean, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        // targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    status: 'completed',
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: targetBalance / walletBalance }
                }
            });
            const currentTime = Date.now();
            const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
            const fractionalMilliseconds = Math.floor(
                (currentTime - Math.floor(currentTime)) * 1000
            );
            const txnId = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
            // Create appropriate record
            if (record) {
                if (isSettlement) {
                    await tx.settlementReport.create({
                        data: {
                            merchant_id: merchantId,
                            settlementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            transactionCount: 1
                        }
                    });
                } else {
                    await tx.disbursement.create({
                        data: {
                            merchant_id: merchantId,
                            disbursementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            status: 'completed',
                            response_message: 'Wallet adjustment',
                            merchant_custom_order_id: txnId,
                            system_order_id: txnId
                        }
                    });
                }
            }
            return {
                success: true,
                type: isSettlement ? 'settlement' : 'disbursement',
                previousBalance: walletBalance,
                newBalance: targetBalance,
                difference: Math.abs(balanceDifference)
            };
        }, {
            timeout: 10000000000000,
            maxWait: 10000000000000
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

async function adjustMerchantWalletBalanceithTx(merchantId: number, targetBalance: number, record: boolean, tx: any, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        // targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        // Update transaction balances
        await tx.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                status: 'completed',
                settlement: true,
                balance: { gt: 0 },
            },
            data: {
                balance: { multiply: targetBalance / walletBalance }
            }
        });
        const currentTime = Date.now();
        const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
        const fractionalMilliseconds = Math.floor(
            (currentTime - Math.floor(currentTime)) * 1000
        );
        const txnId = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
        // Create appropriate record
        if (record) {
            if (isSettlement) {
                await tx.settlementReport.create({
                    data: {
                        merchant_id: merchantId,
                        settlementDate: new Date(),
                        transactionAmount: Math.abs(balanceDifference),
                        merchantAmount: Math.abs(balanceDifference),
                        commission: 0,
                        gst: 0,
                        withholdingTax: 0,
                        transactionCount: 1
                    }
                });
            } else {
                await tx.disbursement.create({
                    data: {
                        merchant_id: merchantId,
                        disbursementDate: new Date(),
                        transactionAmount: Math.abs(balanceDifference),
                        merchantAmount: Math.abs(balanceDifference),
                        commission: 0,
                        gst: 0,
                        withholdingTax: 0,
                        status: 'completed',
                        response_message: 'Wallet adjustment',
                        merchant_custom_order_id: txnId,
                        system_order_id: txnId
                    }
                });
            }
        }
        return {
            success: true,
            type: isSettlement ? 'settlement' : 'disbursement',
            previousBalance: walletBalance,
            newBalance: targetBalance,
            difference: Math.abs(balanceDifference)
        };

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

async function adjustMerchantWalletBalanceWithoutSettlement(merchantId: number, targetBalance: number, record: boolean, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        // targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    status: 'completed',
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: targetBalance / walletBalance }
                }
            });
            return {
                success: true,
                type: isSettlement ? 'settlement' : 'disbursement',
                previousBalance: walletBalance,
                newBalance: targetBalance,
                difference: Math.abs(balanceDifference)
            };
        }, {
            timeout: 10000000,
            maxWait: 10000000
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

async function adjustMerchantDisbursementWalletBalance(merchantId: number, targetBalance: number, record: boolean, wb?: number) {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await getWalletBalance(merchantId) as { walletBalance: number };
        walletBalance = balance.walletBalance;
        targetBalance += walletBalance;
        // }
        // else {
        // walletBalance = wb;
        // }
        if (walletBalance === 0) {
            throw new CustomError("Current balance is 0", 400);
        }
        console.log(targetBalance)
        console.log(targetBalance, walletBalance)
        console.log(targetBalance / walletBalance)


        const balanceDifference = targetBalance - walletBalance;
        const isSettlement = balanceDifference > 0;

        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    status: 'completed',
                    settlement: true,
                    balance: { gt: 0 },
                },
                data: {
                    balance: { multiply: targetBalance / walletBalance }
                }
            });
            const currentTime = Date.now();
            const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
            const fractionalMilliseconds = Math.floor(
                (currentTime - Math.floor(currentTime)) * 1000
            );
            const txnId = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
            // Create appropriate record
            if (record) {
                if (isSettlement) {
                    await tx.settlementReport.create({
                        data: {
                            merchant_id: merchantId,
                            settlementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            transactionCount: 1
                        }
                    });
                } else {
                    await tx.disbursement.create({
                        data: {
                            merchant_id: merchantId,
                            disbursementDate: new Date(),
                            transactionAmount: Math.abs(balanceDifference),
                            merchantAmount: Math.abs(balanceDifference),
                            commission: 0,
                            gst: 0,
                            withholdingTax: 0,
                            status: 'completed',
                            response_message: 'Wallet adjustment',
                            merchant_custom_order_id: txnId,
                            system_order_id: txnId
                        }
                    });
                }
            }
            return {
                success: true,
                type: isSettlement ? 'settlement' : 'disbursement',
                previousBalance: walletBalance,
                newBalance: targetBalance,
                difference: Math.abs(balanceDifference)
            };
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

async function checkMerchantTransactionStats(merchantId: number) {
    try {
        const stats = await prisma.transaction.aggregate({
            _count: true,
            _sum: { balance: true },
            where: {
                merchant_id: merchantId,
                status: 'completed',
                settlement: true,
                balance: { gt: 0 },
            },
        });

        console.log('Merchant Transaction Stats:', stats);
        return stats;
    } catch (error) {
        throw new CustomError('Error fetching transaction stats', 500);
    }
}

async function settleTransactions(transactionIds: string[], settlement: boolean = true) {
    try {
        const txns = await prisma.transaction.findMany({
            where: {
                merchant_transaction_id: { in: transactionIds },
                settlement: false
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }

        // Group transactions by merchant
        const transactionsByMerchant = txns.reduce((acc, txn) => {
            if (!acc[txn.merchant_id]) {
                acc[txn.merchant_id] = [];
            }
            acc[txn.merchant_id].push(txn);
            return acc;
        }, {} as Record<number, typeof txns>);

        // Process each merchant's transactions
        for (const merchantId in transactionsByMerchant) {
            const merchantTxns = transactionsByMerchant[merchantId];
            const findMerchant = await prisma.merchant.findFirst({
                where: {
                    merchant_id: parseInt(merchantId)
                },
                include: { commissions: true }
            })
            const merchant = await prisma.merchantFinancialTerms.findUnique({
                where: { merchant_id: parseInt(merchantId) },
            });

            if (!merchant) {
                throw new CustomError(`Merchant with ID ${merchantId} not found`, 404);
            }

            await prisma.transaction.updateMany({
                where: {
                    transaction_id: { in: merchantTxns.map(txn => txn.transaction_id) },
                },
                data: {
                    settlement,
                    status: "completed",
                    response_message: "success"
                },
            });

            if (settlement) {
                // Aggregate data for the settlement report
                const transactionCount = merchantTxns.length;
                const transactionAmount = merchantTxns.reduce((sum, txn) => sum.plus(txn?.original_amount ?? 0), new Decimal(0));
                const totalCommission = transactionAmount.times(merchant.commissionRate ?? 0);
                const totalGST = totalCommission.times(merchant.commissionGST ?? 0);
                const totalWithholdingTax = transactionAmount.times(merchant.commissionWithHoldingTax ?? 0);
                const merchantAmount = transactionAmount.minus(totalCommission).minus(totalGST).minus(totalWithholdingTax);

                const today = new Date();
                const settlementDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                // Upsert the settlement report
                await prisma.settlementReport.upsert({
                    where: {
                        merchant_id_settlementDate: {
                            merchant_id: parseInt(merchantId),
                            settlementDate,
                        },
                    },
                    create: {
                        merchant_id: parseInt(merchantId),
                        settlementDate,
                        transactionCount,
                        transactionAmount,
                        commission: totalCommission,
                        gst: totalGST,
                        withholdingTax: totalWithholdingTax,
                        merchantAmount,
                    },
                    update: {
                        transactionCount: { increment: transactionCount },
                        transactionAmount: { increment: transactionAmount },
                        commission: { increment: totalCommission },
                        gst: { increment: totalGST },
                        withholdingTax: { increment: totalWithholdingTax },
                        merchantAmount: { increment: merchantAmount },
                    },
                });
            }
            for (const txn of merchantTxns) {
                console.log(txn?.transaction_id)
                if (!settlement) {
                    const scheduledAt = addWeekdays(
                        new Date(),
                        findMerchant?.commissions[0].settlementDuration as number
                    ); // Call the function to get the next 2 weekdays
                    let scheduledTask = await prisma.scheduledTask.create({
                        data: {
                            transactionId: txn.transaction_id,
                            status: "pending",
                            scheduledAt: scheduledAt, // Assign the calculated weekday date
                            executedAt: null, // Assume executedAt is null when scheduling
                        },
                    });
                }
                await transactionService.sendCallback(
                    findMerchant?.webhook_url as string,
                    txn,
                    (txn.providerDetails as JsonObject)?.account as string,
                    "payin",
                    findMerchant?.encrypted == "True" ? true : false,
                    false,
                    "success"
                )
            }
        }

        return 'Transactions settled successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function settleDisbursements(transactionIds: string[]) {
    try {
        const txns = await prisma.disbursement.findMany({
            where: {
                merchant_custom_order_id: { in: transactionIds },
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }

        await prisma.disbursement.updateMany({
            where: {
                merchant_custom_order_id: { in: transactionIds }
            },
            data: {
                status: 'completed',
                response_message: "success"
            }
        })

        for (const txn of txns) {
            const findMerchant = await prisma.merchant.findFirst({
                where: {
                    merchant_id: txn.merchant_id
                }
            })
            await transactionService.sendCallback(
                findMerchant?.webhook_url as string,
                txn,
                (txn.providerDetails as JsonObject)?.account as string,
                "payin",
                findMerchant?.encrypted == "True" ? true : false,
                false,
                "success"
            )
        }
        return 'Transactions settled successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function failTransactions(transactionIds: string[]) {
    try {
        const txns = await prisma.transaction.findMany({
            where: {
                merchant_transaction_id: { in: transactionIds },
                // response_message: "Transaction is Pending"
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }
        await prisma.transaction.updateMany({
            where: {
                merchant_transaction_id: { in: transactionIds },
            },
            data: {
                status: "failed",
                response_message: "User did not respond"
            }
        })

        return 'Transactions failed successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function failDisbursements(transactionIds: string[]) {
    try {
        const txn = await prisma.disbursement.findMany({
            where: {
                merchant_custom_order_id: { in: transactionIds },
            },
            include: {
                merchant: true
            }
        });
        if (txn.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }
        await prisma.disbursement.updateMany({
            where: {
                merchant_custom_order_id: { in: transactionIds },
            },
            data: {
                status: "failed",
                response_message: "failed"
            }
        })
        return 'Disbursements failed successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function failDisbursementsWithAccountInvalid(transactionIds: string[]) {
    try {
        const txns = await prisma.disbursement.findMany({
            where: {
                merchant_custom_order_id: { in: transactionIds },
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }
        await prisma.disbursement.updateMany({
            where: {
                merchant_custom_order_id: { in: transactionIds },
            },
            data: {
                status: "failed",
                response_message: "Account Invalid! Please try again with a valid account"
            }
        })

        return 'Disbursements failed successfully.';
    } catch (error: any) {
        throw new CustomError(error.message || 'Error settling transactions', error.statusCode || 500);
    }
}

async function settleAllMerchantTransactions(merchantId: number) {
    try {
        const merchant = await prisma.merchantFinancialTerms.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        // Step 1: Fetch transactions to be settled
        const merchantTxns = await prisma.transaction.findMany({
            where: {
                merchant_id: merchantId,
                settlement: false,
                balance: { gt: 0 },
                status: 'completed',
            },
        });

        // Step 2: Perform calculations
        const transactionCount = merchantTxns.length;
        const transactionAmount = merchantTxns.reduce(
            (sum, txn) => sum.plus(txn?.original_amount ?? new Decimal(0)),
            new Decimal(0)
        );
        const totalCommission = transactionAmount.times(merchant?.commissionRate ?? 0);
        const totalGST = totalCommission.times(merchant?.commissionGST ?? 0);
        const totalWithholdingTax = transactionAmount.times(merchant?.commissionWithHoldingTax ?? 0);
        const merchantAmount = transactionAmount
            .minus(totalCommission)
            .minus(totalGST)
            .minus(totalWithholdingTax);

        // Step 3: Update transactions to mark them as settled
        const updateResult = await prisma.transaction.updateMany({
            where: {
                merchant_id: merchantId,
                settlement: false,
                balance: { gt: 0 },
                status: 'completed',
            },
            data: {
                settlement: true,
            },
        });

        const today = new Date();

        // Upsert the settlement report
        await prisma.settlementReport.create({
            data: {
                merchant_id: merchantId,
                settlementDate: today,
                transactionCount,
                transactionAmount,
                commission: totalCommission,
                gst: totalGST,
                withholdingTax: totalWithholdingTax,
                merchantAmount,
            }
        });

        // Batching logic for scheduledTask updates
        const BATCH_SIZE = 10000; // Adjust as needed
        const transactionIds = merchantTxns.map(txn => txn.transaction_id);
        for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
            const batch = transactionIds.slice(i, i + BATCH_SIZE);
            await prisma.scheduledTask.updateMany({
                where: {
                    transactionId: { in: batch }
                },
                data: {
                    status: "completed",
                    executedAt: new Date()
                }
            });
        }
        return 'All merchant transactions settled successfully.';
    } catch (error) {
        console.log(error)
        throw new CustomError('Error settling all transactions', 500);
    }
}

async function settleAllMerchantTransactionsUpdated(merchantId: number) {
    try {
        const merchant = await prisma.merchantFinancialTerms.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        // Step 0: Get end of yesterday in PKT (Asia/Karachi) and convert to UTC
        const yesterday = subDays(new Date(), 1); // local time yesterday
        const endOfYesterdayPKT = toZonedTime(endOfDay(yesterday), 'Asia/Karachi');

        // Step 1: Fetch transactions up to end of yesterday in PKT
        const merchantTxns = await prisma.transaction.findMany({
            where: {
                merchant_id: merchantId,
                settlement: false,
                balance: { gt: 0 },
                status: 'completed',
                date_time: {
                    lte: endOfYesterdayPKT,
                },
            },
            orderBy: {
                date_time: 'desc'
            }
        });

        console.log(merchantTxns.map(txn => txn.merchant_transaction_id))

        // Step 2: Perform calculations
        const transactionCount = merchantTxns.length;
        const transactionAmount = merchantTxns.reduce(
            (sum, txn) => sum.plus(txn?.original_amount ?? new Decimal(0)),
            new Decimal(0)
        );
        const totalCommission = transactionAmount.times(merchant?.commissionRate ?? 0);
        const totalGST = totalCommission.times(merchant?.commissionGST ?? 0);
        const totalWithholdingTax = transactionAmount.times(merchant?.commissionWithHoldingTax ?? 0);
        const merchantAmount = transactionAmount
            .minus(totalCommission)
            .minus(totalGST)
            .minus(totalWithholdingTax);

        // Step 3: Update transactions to mark them as settled
        return await prisma.$transaction(async tx => {
            const updateResult = await tx.transaction.updateMany({
                where: {
                    merchant_id: merchantId,
                    settlement: false,
                    balance: { gt: 0 },
                    status: 'completed',
                },
                data: {
                    settlement: true,
                },
            });

            const today = new Date();

            // Upsert the settlement report
            await tx.settlementReport.create({
                data: {
                    merchant_id: merchantId,
                    settlementDate: today,
                    transactionCount,
                    transactionAmount,
                    commission: totalCommission,
                    gst: totalGST,
                    withholdingTax: totalWithholdingTax,
                    merchantAmount,
                }
            });

            await tx.scheduledTask.updateMany({
                where: {
                    transactionId: { in: merchantTxns.map(txn => txn.transaction_id) }
                },
                data: {
                    status: 'completed'
                }
            });
            return 'All merchant transactions settled successfully.';
        }, {
            timeout: 3600000,
            maxWait: 3600000
        })

    } catch (error) {
        console.log(error);
        throw new CustomError('Error settling all transactions', 500);
    }
}

const createTransactionService = async (body: any, merchant_id: string) => {
    try {
        const merchant = await prisma.merchantFinancialTerms.findUnique({
            where: { merchant_id: parseInt(merchant_id) },
        });
        // Calculate Settlement Values
        const commission = (Number(merchant?.commissionRate) ?? 1) * body.original_amount;
        const gst = (Number(merchant?.commissionGST) ?? 1) * body.original_amount;
        const withholdingTax = (Number(merchant?.commissionWithHoldingTax) ?? 1) * body.original_amount; // Example: 10% withholding tax
        const merchantAmount = body.original_amount - commission - gst - withholdingTax;
        const today = new Date();
        const settlementDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const formattedDate = format(new Date(), 'yyyyMMddHHmmss');
        const currentTime = Date.now();
        const fractionalMilliseconds = Math.floor(
            (currentTime - Math.floor(currentTime)) * 1000
        );
        const txnRefNo = `T${formattedDate}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`
        return await prisma.$transaction(async (tx) => {
            // Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    transaction_id: txnRefNo,
                    merchant_transaction_id: txnRefNo,
                    merchant_id: Number(merchant_id),
                    original_amount: body.original_amount,
                    status: "completed",
                    type: "wallet",
                    date_time: new Date(),
                    settlement: body.settlement,
                    balance: merchantAmount,
                    providerDetails: {
                        name: body.provider_name,
                        msisdn: body.provider_account,
                    },
                    response_message: "success",
                },
            });
            // Update or Create SettlementReport

            if (!body.settlement) {
                const scheduledAt = addWeekdays(
                    new Date(),
                    merchant?.settlementDuration as number
                ); // Call the function to get the next 2 weekdays
                let scheduledTask = await tx.scheduledTask.create({
                    data: {
                        transactionId: txnRefNo,
                        status: "pending",
                        scheduledAt: scheduledAt, // Assign the calculated weekday date
                        executedAt: null, // Assume executedAt is null when scheduling
                    },
                });
                return { transaction };

            }
            const settlement = await tx.settlementReport.upsert({
                where: {
                    merchant_id_settlementDate: {
                        merchant_id: Number(merchant_id),
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
                    merchant_id: Number(merchant_id),
                    settlementDate,
                    transactionCount: 1,
                    transactionAmount: body.original_amount,
                    commission,
                    gst,
                    withholdingTax,
                    merchantAmount,
                },
            });
            return { transaction, settlement }
        })

    }
    catch (err) {
        return err;
    }
}

async function deleteMerchantData(merchantId: number) {
    try {
        await prisma.$transaction(async (tx) => {
            // Delete all dependent data
            await tx.userGroup.deleteMany({
                where: { merchantId },
            });

            await tx.merchantFinancialTerms.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.merchantProviderCredential.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.disbursement.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.settlementReport.deleteMany({
                where: { merchant_id: merchantId },
            });

            await tx.transaction.deleteMany({
                where: { merchant_id: merchantId },
            });

            // Finally, delete the merchant
            await tx.merchant.delete({
                where: { merchant_id: merchantId },
            });

            await tx.user.delete({
                where: { id: merchantId },
            })
        }, {
            timeout: 10000
        });

        console.log(`Merchant with ID ${merchantId} and all related data have been deleted.`);
    } catch (error) {
        console.error(`Error deleting merchant with ID ${merchantId}:`, error);
    } finally {
        await prisma.$disconnect();
    }
}

async function payinCallback(orderIds: string[]) {
    try {
        const txns = await prisma.transaction.findMany({
            where: {
                merchant_transaction_id: { in: orderIds }
            }
        });
        if (txns.length <= 0) {
            throw new CustomError("Transactions not found", 404);
        }

        // Group transactions by merchant
        const transactionsByMerchant = txns.reduce((acc, txn) => {
            if (!acc[txn.merchant_id]) {
                acc[txn.merchant_id] = [];
            }
            acc[txn.merchant_id].push(txn);
            return acc;
        }, {} as Record<number, typeof txns>);
        console.log(transactionsByMerchant)
        for (const merchantId in transactionsByMerchant) {
            const merchant = await prisma.merchant.findFirst({
                where: {
                    merchant_id: Number(merchantId)
                }
            })
            const merchantTxns = transactionsByMerchant[merchantId];
            for (const txn of merchantTxns) {
                console.log(merchant?.webhook_url)
                if (txn.status == "completed") {
                    await transactionService.sendCallback(
                        merchant?.webhook_url as string,
                        txn,
                        (txn.providerDetails as JsonObject)?.account as string,
                        "payin",
                        merchant?.encrypted == "True" ? true : false,
                        false,
                        "success"
                    )
                }
                else if (txn.status == "failed") {
                    await transactionService.sendCallback(
                        merchant?.webhook_url as string,
                        txn,
                        (txn.providerDetails as JsonObject)?.account as string,
                        "payin",
                        merchant?.encrypted == "True" ? true : false,
                        false,
                        "failed"
                    )
                }
            }
        }
    }
    catch (err) {
        console.log(err)
    }
}

async function payoutCallback(orderIds: string[]) {
    const txns = await prisma.disbursement.findMany({
        where: {
            merchant_custom_order_id: { in: orderIds }
        }
    });
    if (txns.length <= 0) {
        throw new CustomError("Transactions not found", 404);
    }

    // Group transactions by merchant
    const transactionsByMerchant = txns.reduce((acc, txn) => {
        if (!acc[txn.merchant_id]) {
            acc[txn.merchant_id] = [];
        }
        acc[txn.merchant_id].push(txn);
        return acc;
    }, {} as Record<number, typeof txns>);
    console.log(transactionsByMerchant)
    for (const merchantId in transactionsByMerchant) {
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: Number(merchantId)
            }
        })
        const merchantTxns = transactionsByMerchant[merchantId];
        console.log(merchant?.encrypted)
        for (const txn of merchantTxns) {
            console.log(merchant?.webhook_url)
            let webhook_url;
            if (merchant?.callback_mode == "DOUBLE") {
                webhook_url = merchant?.payout_callback as string
            }
            else {
                webhook_url = merchant?.webhook_url as string
            }
            if (txn?.status == "completed") {
                await transactionService.sendCallback(
                    webhook_url as string,
                    { original_amount: txn.transactionAmount, date_time: txn.disbursementDate, merchant_transaction_id: txn.merchant_custom_order_id, merchant_id: txn.merchant_id },
                    (txn as unknown as JsonObject)?.account as string,
                    "payout",
                    merchant?.encrypted == "True" ? true : false,
                    false,
                    "success"
                )
            }
            else if (txn?.status == "failed") {
                await transactionService.sendCallback(
                    webhook_url as string,
                    { original_amount: txn.transactionAmount, date_time: txn.disbursementDate, merchant_transaction_id: txn.merchant_custom_order_id, merchant_id: txn.merchant_id },
                    (txn as unknown as JsonObject)?.account as string,
                    "payout",
                    merchant?.encrypted == "True" ? true : false,
                    false,
                    "failed"
                )
            }
        }
    }
}

async function divideSettlementRecords(ids: number[], factor: number) {
    if (ids.length == 0 || factor <= 0) {
        throw new CustomError("Invalid Body Values", 404);
    }

    const records = await prisma.settlementReport.findMany({
        where: {
            id: { in: ids }
        }
    })

    if (records.length == 0) {
        throw new CustomError("Invalid Settlement IDs", 400);
    }
    records.map(async (record) => await prisma.settlementReport.updateMany({
        where: {
            id: { in: ids }
        },
        data: {
            transactionCount: record.transactionCount / factor,
            transactionAmount: Number(record.transactionAmount) / factor,
            commission: Number(record.commission) / factor,
            gst: Number(record.gst) / 2,
            withholdingTax: Number(record.withholdingTax) / factor,
            merchantAmount: Number(record.merchantAmount) / factor
        }
    }))

    return "Records divided successfully";
}

async function processTodaySettlements() {
    // 1. Define the start and end of today.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Fetch all settlement reports for today including the related merchant.
    const settlementReports = await prisma.settlementReport.findMany({
        where: {
            settlementDate: {
                gte: startOfToday,
                lt: endOfToday,
            },
            // merchant_id: 5
        },
        orderBy: {
            "settlementDate": "desc"
        },
        distinct: ['merchant_id'], // returns one record per merchant
        include: {
            merchant: true, // so we can access merchant.disburseBalancePercent
        },
        // take: 1
    });
    // Array to store results for each merchant processing
    const results: { merchant_id: number; status: string; message: string }[] = [];
    console.log(settlementReports)
    // 3 & 4. For each settlement report, calculate the deduction and update the merchant.
    //    We assume each merchant has an "availableBalance" field.
    for (const report of settlementReports) {
        try {
            const merchant = report.merchant;
            // Calculate the deduction:
            // For example: if disburseBalancePercent is 10 (10%) and merchantAmount is 100,
            // then deduction = (10 / 100) * 100 = 10.
            let deduction;
            if (Number(merchant.disburseBalancePercent) === 0) {
                throw new CustomError("Percentage not set", 500)
            }
            deduction = Number(merchant.disburseBalancePercent) * Number(report.merchantAmount);

            // Log the details (optional)
            console.log(
                `Updating merchant ${merchant.merchant_id}: Deducting ${deduction} from available balance and adding it to disbursement balance.`
            );

            // 4. Update the merchant record.
            //    We use atomic operations 'decrement' and 'increment' to update the balances.
            const { walletBalance } = await getWalletBalance(merchant.merchant_id) as { walletBalance: number };
            if (deduction > walletBalance) {
                throw new CustomError("Deduction larger than balance", 500)
            }
            const updatedAvailableBalance = walletBalance - Number(deduction);
            await adjustMerchantWalletBalance(merchant.merchant_id, updatedAvailableBalance, false);
            await prisma.$transaction(async (tx) => {
                await tx.merchant.update({
                    where: {
                        merchant_id: merchant.merchant_id,
                    },
                    data: {
                        // IMPORTANT:
                        // The Merchant model provided does not include an "availableBalance" field.
                        // Make sure to add it if you want to update the available balance.
                        balanceToDisburse: {
                            increment: deduction,
                        },
                    },
                });
                await tx.disbursementRequest.create({
                    data: {
                        requestedAmount: deduction,
                        merchantId: merchant.merchant_id,
                        status: "approved",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                })
            })

            results.push({
                merchant_id: merchant.merchant_id,
                status: 'success',
                message: `Merchant ${merchant.merchant_id} processed successfully with a deduction of ${deduction}.`,
            });
        }
        catch (err: any) {
            // Record a failure message for this merchant.
            results.push({
                merchant_id: report.merchant.merchant_id,
                status: 'failure',
                message: `Error processing merchant ${report.merchant.merchant_id}: ${err?.message || err}`,
            });
        }
    }
    return results;
}

async function createUSDTSettlement(body: any) {
    try {
        const settlement = await prisma.uSDTSettlement.create({
            data: {
                merchant_id: body.merchant_id,
                date: toZonedTime(new Date(body.date), 'Asia/Karachi'),
                pkr_amount: body.pkr_amount,
                usdt_amount: body.usdt_amount,
                usdt_pkr_rate: body.usdt_pkr_rate,
                conversion_charges: body.conversion_charges,
                total_usdt: body.total_usdt,
                wallet_address: body.wallet_address,
            },
        });
        return settlement;
    }
    catch (err: any) {
        throw new CustomError(err?.message, 500)
    }
}

async function calculateFinancials(merchant_id: number): Promise<CalculatedFinancials> {
    try {
        let merchant = await prisma.merchantFinancialTerms.findUnique({
            where: {
                merchant_id
            }
        })
        const {
            totalIncome = 0,
            remainingSettlements = 0,
            availableBalance = 0,
            disbursementBalance = 0,
            disbursementAmount = 0,
            totalUsdtSettlement = 0,
            totalRefund = 0,
        } = await dashboardService.merchantDashboardDetails({}, { merchant_id }) as MerchantDashboardData;

        // const settled = new Decimal(totalIncome).minus(remainingSettlements);
        // const payinCommission = settled.times(merchant?.commissionRate as Decimal);
        const payinCommission = new Decimal((await prisma.$queryRawUnsafe<
            { total: number }[]
        >(`
        SELECT SUM(commission + gst + "withholdingTax") as total FROM "SettlementReport" where merchant_id = ${merchant_id};
      `))[0]?.total || 0);
        const settled = new Decimal((await prisma.$queryRawUnsafe<
            { settled: number }[]
        >(`
            SELECT SUM("transactionAmount") as settled FROM "SettlementReport" where merchant_id = ${merchant_id};
        `))[0]?.settled || 0);
        const settledBalance = new Decimal((await prisma.$queryRawUnsafe<
            { settledBalance: number }[]
        >(`
            SELECT SUM("merchantAmount") as "settledBalance" FROM "SettlementReport" where merchant_id = ${merchant_id};
        `))[0]?.settledBalance || 0);
        const payoutCommission = new Decimal((await prisma.$queryRawUnsafe<
            { total: number }[]
        >(`
        SELECT SUM("commission" + "gst" + "withholdingTax") as total FROM "Disbursement" where merchant_id = ${merchant_id} and status='completed';
      `))[0]?.total || 0);
        const totalDisbursement = new Decimal(disbursementAmount || 0).plus(payoutCommission);
        const disbursementSum = new Decimal(availableBalance || 0)
            .plus(disbursementBalance)
            .plus(totalDisbursement)
            .plus(totalUsdtSettlement)
            .plus(totalRefund);
        const difference = disbursementSum.minus(settledBalance);

        const differenceInSettlements = new Decimal(remainingSettlements || 0)
            .plus(settled)
            .minus(totalIncome);
        return {
            totalIncome,
            remainingSettlements,
            availableBalance,
            disbursementBalance,
            disbursementAmount,
            totalUsdtSettlement,
            totalRefund,
            settled,
            payinCommission,
            settledBalance,
            payoutCommission,
            totalDisbursement,
            disbursementSum,
            difference,
            differenceInSettlements
        };
    }
    catch (err: any) {
        console.log(`Error: ${err}`);
        return err;
    }
}

async function adjustMerchantDisbursementBalance(merchantId: number, targetBalance: number, record: boolean, type: "in" | "de") {
    try {
        // Get current balance
        let walletBalance;
        // if (!wb) {
        const balance = await prisma.merchant.findFirst({
            where: {
                merchant_id: +merchantId,
            },
            select: {
                balanceToDisburse: true,
                disburseBalancePercent: true
            }
        });
        walletBalance = balance?.balanceToDisburse;
        // targetBalance += walletBalance;
        // }
        // else {
        let update = {};
        if (type == "in") {
            update = { increment: targetBalance }
        }
        else {
            update = { decrement: targetBalance }
        }
        // Execute in transaction
        return await prisma.$transaction(async (tx) => {
            // Update transaction balances
            await tx.merchant.update({
                where: {
                    merchant_id: merchantId,
                },
                data: {
                    balanceToDisburse: update
                }
            });
            // Create appropriate record
            return {
                success: true,
                previousBalance: walletBalance,
                newBalance: targetBalance,
            };
        }, {
            timeout: 10000000000000,
            maxWait: 10000000000000
        });

    } catch (error) {
        throw new CustomError(
            error instanceof Error ? error.message : 'Failed to adjust wallet balance',
            500
        );
    }
}

export default {
    adjustMerchantWalletBalance,
    checkMerchantTransactionStats,
    removeMerchantFinanceData,
    settleAllMerchantTransactions,
    settleTransactions,
    zeroMerchantWalletBalance,
    createTransactionService,
    deleteMerchantData,
    adjustMerchantDisbursementWalletBalance,
    payinCallback,
    payoutCallback,
    divideSettlementRecords,
    adjustMerchantWalletBalanceWithoutSettlement,
    failTransactions,
    failDisbursements,
    processTodaySettlements,
    createUSDTSettlement,
    adjustMerchantWalletBalanceithTx,
    settleAllMerchantTransactionsUpdated,
    calculateFinancials,
    adjustMerchantDisbursementBalance,
    failDisbursementsWithAccountInvalid,
    settleDisbursements,
    getWalletBalance
}