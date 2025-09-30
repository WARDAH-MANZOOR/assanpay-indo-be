import { Request, Response } from "express";
import prisma from "../../lib/prisma.js"
import { toZonedTime } from "date-fns-tz";
import { Decimal, JsonObject } from "@prisma/client/runtime/library";
import { transactionService } from "../../services/index.js";

const addWeekdays = (date: Date, days: number) => {
    // Get the current date
    const date2 = new Date(date);

    // Define the Pakistan timezone
    const timeZone = 'Asia/Karachi';

    // Convert the date to the Pakistan timezone
    const zonedDate = toZonedTime(date2, timeZone);
    let addedDays = 0;

    while (addedDays < days) {
        zonedDate.setDate(zonedDate.getDate() + 1);

        // Skip weekends
        const dayOfWeek = zonedDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            addedDays++;
        }
    }
    // Set a random time before 4:00 pm (16:00)
    zonedDate.setHours(0, 0, 0, 0);

    return zonedDate;
};

const callbackController = async (req: Request, res: Response) => {
    try {
        console.log('=== PAYIN CALLBACK CONTROLLER START ===');
        console.log('📥 Incoming request query:', JSON.stringify(req.query, null));
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null));

        const reference = (req.query.reference || req.body.reference) as string;
        const status = (req.query.status || req.body.status) as string;
        const payment_method = (req.query.payment_method || req.body.payment_method) as string;

        console.log('🔍 Extracted callback data:', { reference, status, payment_method });

        if (!reference || !status) {
            console.log('❌ Missing required callback parameters');
            return res.status(400).json({ status: "error", message: "Missing required query params" });
        }

        const validStatuses = ['success', 'failed', 'cancelled', 'rejected', 'pending', 'awaited', 'onhold'];
        if (!validStatuses.includes((status as string).toLocaleLowerCase())) {
            console.log('❌ Invalid status received:', status);
            return res.status(400).json({ status: 'error', message: 'Invalid status' });
        }

        console.log('🔍 Looking up transaction for reference:', reference);

        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: reference
                    },
                    {
                        transaction_id: reference
                    }
                ]
            }
        })
        
        console.log('💾 Transaction found:', JSON.stringify(txn, null, 2));
        
        if (!txn) {
            console.log('❌ Transaction Not Found for reference:', reference);
            throw new Error("Transaction Not Found");
        }
        
        const findMerchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant_id
            }
        })
        
        console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));
        
        if (status?.toString().toLocaleUpperCase() == "SUCCESS") {
            console.log('✅ Processing SUCCESS callback');
            
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: reference
                        },
                        {
                            transaction_id: reference
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: "success"
                }
            })
            
            console.log('💾 Transaction updated to completed status');
            
            if (txn?.status != "completed") {
                const scheduledAt = addWeekdays(new Date(), 1);
                console.log('📅 Creating scheduled task for:', scheduledAt);
                
                let scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: txn?.transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt,
                        executedAt: null,
                    }
                });
                
                console.log('📋 Scheduled task created:', JSON.stringify(scheduledTask, null, 2));
                
                console.log('📤 Sending webhook callback to merchant');
                await transactionService.sendCallback(
                    (findMerchant?.webhook_url as string),
                    txn,
                    (txn?.providerDetails as JsonObject)?.account as string,
                    "payin",
                    findMerchant?.encrypted == "True" ? true : false,
                    false,
                    "success"
                )
                console.log('✅ Webhook callback sent successfully');
            }
        }
        else if (status?.toString().toLocaleUpperCase() == "FAILED" || status?.toString().toLocaleUpperCase() == "CANCELLED" || status?.toString().toLocaleUpperCase() == "REJECTED") {
            console.log('❌ Processing FAILED/CANCELLED/REJECTED callback');
            
            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: reference
                        },
                        {
                            transaction_id: reference
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: "failed"
                }
            })
            
            console.log('💾 Transaction updated to failed status');
            
            console.log('📤 Sending webhook callback to merchant');
            await transactionService.sendCallback(
                (findMerchant?.webhook_url as string),
                txn,
                (txn?.providerDetails as JsonObject)?.account as string,
                "payin",
                findMerchant?.encrypted == "True" ? true : false,
                false,
                "failed"
            )
            console.log('✅ Webhook callback sent successfully');
        }
        
        console.log('✅ Payin callback processed successfully');
        console.log('=== PAYIN CALLBACK CONTROLLER END ===');
        return res.status(200).json({ status: 'success', message: 'Callback received' });
    } catch (error: any) {
        console.error('❌ Error handling payin callback:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== PAYIN CALLBACK CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: 'Callback processing failed' });
    }
}

const adjustMerchantToDisburseBalance = async (merchantId: string, amount: number, isIncrement: boolean) => {
    try {
        let obj;
        if (isIncrement) {
            obj = await prisma?.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        increment: amount
                    }
                },
            });
        } else {
            obj = await prisma?.merchant.updateMany({
                where: {
                    uid: merchantId,
                },
                data: {
                    balanceToDisburse: {
                        decrement: amount
                    },
                },
            });
        }

        return {
            message: "Merchant balance updated successfully",
            obj
        };
    }
    catch (err: any) {
        throw new Error(err.message);
    }
}

const payoutCallbackController = async (req: Request, res: Response) => {
    try {
        console.log('=== PAYOUT CALLBACK CONTROLLER START ===');
        console.log('📥 Incoming request query:', JSON.stringify(req.query, null));
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null));

        const query = req.query || req.body;
        const reference = (req.query.reference || req.body.reference) as string;
        const status = (req.query.status || req.body.status) as string;
        const payment_method = (req.query.payment_method || req.body.payment_method) as string;

        console.log('🔍 Extracted payout callback data:', { reference, status, payment_method });

        if (!reference || !status) {
            console.log('❌ Missing required payout callback parameters');
            return res.status(400).json({ status: "error", message: "Missing required query params" });
        }

        const validStatuses = ['success', 'failed', 'cancelled', 'rejected', 'pending', 'awaited', 'onhold'];
        if (!validStatuses.includes((status as string).toLocaleLowerCase())) {
            console.log('❌ Invalid payout status received:', status);
            return res.status(400).json({ status: 'error', message: 'Invalid status' });
        }

        if (query?.status?.toLocaleString().toLocaleLowerCase() == "pending") {
            console.log('⏳ Payout status is pending, returning early');
            return res.status(200).json({ status: 'success', message: 'Callback received' });
        }
        
        console.log('🔍 Looking up disbursement for reference:', reference);
        
        const txn = await prisma.disbursement.findFirst({
            where: {
                OR: [
                    {
                        merchant_custom_order_id: reference
                    },
                    {
                        system_order_id: reference
                    }
                ]
            }
        })
        
        console.log('💾 Disbursement found:', JSON.stringify(txn, null, 2));
        
        if (!txn) {
            console.log('❌ Disbursement Not Found for reference:', reference);
            throw new Error("Transaction Not Found");
        }
        
        const findMerchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant_id
            }
        })
        
        console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));
        
        if (status?.toString().toLocaleUpperCase() == "SUCCESS") {
            console.log('✅ Processing SUCCESS payout callback');
            
            await prisma.disbursement.updateMany({
                where: {
                    OR: [
                        {
                            merchant_custom_order_id: reference
                        },
                        {
                            transaction_id: reference
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: "success",
                    providerDetails: {
                        ...(txn?.providerDetails as JsonObject),
                        name: payment_method
                    }
                }
            })
            
            console.log('💾 Disbursement updated to completed status');
            
            if (txn?.status != "completed") {
                console.log('📤 Sending payout webhook callback to merchant');
                await transactionService.sendCallback(
                    findMerchant?.callback_mode == "SINGLE" ? (findMerchant?.webhook_url as string) : (findMerchant?.payout_callback as string),
                    { original_amount: txn.transactionAmount, date_time: txn.disbursementDate, merchant_transaction_id: txn.merchant_custom_order_id, merchant_id: txn.merchant_id },
                    (txn?.providerDetails as JsonObject)?.account as string,
                    "payout",
                    findMerchant?.encrypted == "True" ? true : false,
                    false,
                    "success"
                )
                console.log('✅ Payout webhook callback sent successfully');
            }
        }
        else if (status?.toString().toLocaleUpperCase() == "FAILED") {
            console.log('❌ Processing FAILED payout callback');
            
            await prisma.disbursement.updateMany({
                where: {
                    OR: [
                        {
                            merchant_custom_order_id: reference
                        },
                        {
                            transaction_id: reference
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: "failed",
                    providerDetails: {
                        ...(txn?.providerDetails as JsonObject),
                        name: payment_method
                    }
                }
            })
            
            console.log('💾 Disbursement updated to failed status');
            
            console.log('📤 Sending payout webhook callback to merchant');
            await transactionService.sendCallback(
                findMerchant?.callback_mode == "SINGLE" ? (findMerchant?.webhook_url as string) : (findMerchant?.payout_callback as string),
                { original_amount: txn.transactionAmount, date_time: txn.disbursementDate, merchant_transaction_id: txn.merchant_custom_order_id, merchant_id: txn.merchant_id },
                (txn?.providerDetails as JsonObject)?.account as string,
                "payout",
                findMerchant?.encrypted == "True" ? true : false,
                false,
                "failed"
            )
            console.log('✅ Payout webhook callback sent successfully');
            
            console.log('💰 Adjusting merchant balance for failed payout');
            adjustMerchantToDisburseBalance(findMerchant?.uid as string, +txn?.merchantAmount + +txn?.commission + +txn?.gst + +txn?.withholdingTax, true)
            console.log('✅ Merchant balance adjusted');
        }
        
        console.log('✅ Payout callback processed successfully');
        console.log('=== PAYOUT CALLBACK CONTROLLER END ===');
        return res.status(200).json({ status: 'success', message: 'Callback received' });
    } catch (error: any) {
        console.error('❌ Error handling payout callback:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== PAYOUT CALLBACK CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: 'Callback processing failed' });
    }
}

const dummyCallback = async (req: Request, res: Response) => {
    try {
        console.log('=== DUMMY CALLBACK CONTROLLER START ===');
        console.log('📥 Incoming request query:', JSON.stringify(req.query, null, 2));
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null, 2));
        console.log('✅ Dummy callback processed successfully');
        console.log('=== DUMMY CALLBACK CONTROLLER END ===');
        return res.status(200).send('success');
    } catch (error: any) {
        console.error('❌ Error handling dummy callback:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== DUMMY CALLBACK CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: 'Callback processing failed' });
    }
}

export default {
    callbackController,
    dummyCallback,
    payoutCallbackController
}