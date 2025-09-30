import { JsonObject } from "@prisma/client/runtime/library";
import { Request, Response } from "express";
import { transactionService } from "../../services/index.js";
import { addWeekdays } from "../../utils/date_method.js";
import axios from "axios";
import FormData from "form-data"
import { Prisma } from "@prisma/client";

const updateTxn = async (transaction_id: string, obj: any, duration: number) => {
    return await prisma?.$transaction(async (tx: Prisma.TransactionClient) => {
        const existingTransaction = await tx.transaction.findUnique({
            where: { transaction_id: transaction_id }
        });

        if (existingTransaction) {
            await tx.transaction.update({
                where: { transaction_id: transaction_id },
                data: {
                    ...obj
                },
            });
        } else {
            console.error("Transaction not found for updating:", transaction_id);
        }

        const provider = await tx.provider.upsert({
            where: {
                name_txn_type_version: {
                    name: "EasyPaisa",
                    txn_type: "MA",
                    version: "",
                },
            },
            update: {},
            create: {
                name: "EasyPaisa",
                txn_type: "MA",
                version: "",
            },
        });
        if (obj.status == "completed") {
            const scheduledAt = addWeekdays(new Date(), duration);  // Call the function to get the next 2 weekdays
            console.log(scheduledAt)
            let scheduledTask = await tx.scheduledTask.create({
                data: {
                    transactionId: transaction_id,
                    status: 'pending',
                    scheduledAt: scheduledAt,  // Assign the calculated weekday date
                    executedAt: null,  // Assume executedAt is null when scheduling
                }
            });
        }
    }, {
        timeout: 60000,
        maxWait: 60000
    });
};

const dalalMartCallbackController = async (req: Request, res: Response) => {
    try {
        console.log('=== DALALMART CALLBACK CONTROLLER START ===');
        console.log('📥 Incoming request query:', JSON.stringify(req.query, null));
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null));

        const reference = (req.query.trx_id) as string;
        const status = (req.body.txn_status) as string;
        const payment_method = (req.body.txn_processor) as string;
        const txn_id = (req.body.bank_txn_id) as string;

        console.log('🔍 Extracted callback data:', { reference, status, payment_method, txn_id });

        if (!reference || !status || !payment_method) {
            console.log('❌ Missing required callback parameters');
            return res.status(400).json({ status: "error", message: "Missing required query params" });
        }

        const validStatuses = ['success', 'failed', 'cancel'];
        if (!validStatuses.includes((status as string).toLocaleLowerCase())) {
            console.log('❌ Invalid status received:', status);
            return res.status(400).json({ status: 'error', message: 'Invalid status' });
        }

        console.log('🔍 Looking up transaction for reference:', reference);

        const txn = await prisma?.transaction.findFirst({
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

        const findMerchant = await prisma?.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant_id
            }
        })
        
        console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));
        
        if (status?.toString().toLocaleUpperCase() == "SUCCESS") {
            console.log('✅ Processing SUCCESS callback');
            
            await prisma?.transaction.updateMany({
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
                    response_message: "success",
                    providerDetails: {
                        ...(txn?.providerDetails as JsonObject),
                        transactionId: txn_id
                    }
                }
            })
            
            console.log('💾 Transaction updated to completed status');
            
            if (txn?.status != "completed") {
                const scheduledAt = addWeekdays(new Date(), 1);
                console.log('📅 Creating scheduled task for:', scheduledAt);
                
                let scheduledTask = await prisma?.scheduledTask.create({
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
            } else {
                console.log('ℹ️ Transaction already completed, skipping webhook');
            }
        }
        else {
            console.log('❌ Processing FAILED callback');
            
            await prisma?.transaction.updateMany({
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
                    response_message: "failed",
                    providerDetails: {
                        ...(txn?.providerDetails as JsonObject),
                        transactionId: txn_id
                    }
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
        
        console.log('✅ DalalMart callback processed successfully');
        console.log('=== DALALMART CALLBACK CONTROLLER END ===');
        return res.status(200).json('success');
    } catch (error: any) {
        console.error('❌ Error handling DalalMart callback:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== DALALMART CALLBACK CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: 'Callback processing failed' });
    }
}

const dalalMartPayoutCallbackController = async (req: Request, res: Response) => {
    try {
        console.log('=== DALALMART PAYOUT CALLBACK CONTROLLER START ===');
        console.log('📥 Incoming request query:', JSON.stringify(req.query, null));
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null));

        const reference = (req.query.trx_id) as string;
        const status = (req.body.status) as string;
        const txn_id = (req.body.bank_txn_id) as string;

        console.log('🔍 Extracted payout callback data:', { reference, status, txn_id });

        if (!reference || !status || !txn_id) {
            console.log('❌ Missing required payout callback parameters');
            return res.status(200).json({ status: "error", message: "Reference and status are required" });
        }
        
        console.log('🔍 Looking up disbursement for reference:', reference);
        
        const txn = await prisma?.disbursement.findFirst({
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
        
        const findMerchant = await prisma?.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant_id
            }
        })
        
        console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));
        
        if (status == "SUCCESS") {
            console.log('✅ Processing SUCCESS payout callback');
            
            await prisma?.disbursement.update({
                where: {
                    merchant_custom_order_id: reference
                },
                data: {
                    status: "completed",
                    response_message: "success",
                    transaction_id: txn_id
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
            } else {
                console.log('ℹ️ Disbursement already completed, skipping webhook');
            }
        }
        else {
            console.log('❌ Processing FAILED payout callback');
            
            await prisma?.disbursement.update({
                where: {
                    merchant_custom_order_id: reference
                },
                data: {
                    status: "failed",
                    response_message: "failed",
                    transaction_id: txn_id
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
        }
        
        console.log('✅ DalalMart payout callback processed successfully');
        console.log('=== DALALMART PAYOUT CALLBACK CONTROLLER END ===');
        return res.status(200).send('success');
    } catch (error: any) {
        console.error('❌ Error handling DalalMart payout callback:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== DALALMART PAYOUT CALLBACK CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: 'Callback processing failed' });
    }
}

export default {
    dalalMartCallbackController,
    dalalMartPayoutCallbackController,
}