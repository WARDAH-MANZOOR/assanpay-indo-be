import { JsonObject, JsonValue } from "@prisma/client/runtime/library";
import prisma from "../../lib/prisma.js";
import { transactionService } from "../../services/index.js";
import CustomError from "../../utils/custom_error.js";
import { addWeekdays } from "../../utils/date_method.js";
import CryptoJS from "crypto-js"
import axios from "axios";

// Example of the request body fields
export interface PaymentRequestBody {
    pp_Version: string;
    pp_TxnType: string;
    pp_BankID?: string;
    pp_ProductID?: string | null;
    pp_Password: string;
    pp_TxnRefNo: string;
    pp_TxnDateTime: string;
    pp_ResponseCode: string;
    pp_ResponseMessage: string;
    pp_AuthCode: string;
    pp_SettlementExpiry?: string | null;
    pp_RetreivalReferenceNo: string;
    pp_SecureHash: string;
}

export interface PaymentResponse {
    pp_ResponseCode: string;
    pp_ResponseMessage: string;
    pp_SecureHash: string;
    returnUrl?: string
}

const processIPN = async (requestBody: PaymentRequestBody): Promise<PaymentResponse> => {
    try {
        console.log('=== PROCESS IPN START ===');
        console.log('📥 IPN Request Body:', JSON.stringify(requestBody, null, 2));
        console.log('🔍 Transaction Reference:', requestBody.pp_TxnRefNo);
        console.log('🔍 Response Code:', requestBody.pp_ResponseCode);
        console.log('🔍 Response Message:', requestBody.pp_ResponseMessage);

        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: requestBody.pp_TxnRefNo
                    },
                    {
                        transaction_id: requestBody.pp_TxnRefNo
                    }
                ]
            }
        })

        console.log('💾 Transaction found:', JSON.stringify(txn, null, 2));

        if (!txn) {
            console.log('❌ Transaction Not Found for reference:', requestBody.pp_TxnRefNo);
            throw new CustomError("Transaction Not Found", 500);
        }

        if (requestBody.pp_ResponseCode == "121") {
            console.log('✅ Processing SUCCESS IPN (Response Code: 121)');

            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: requestBody.pp_TxnRefNo
                        },
                        {
                            transaction_id: requestBody.pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: requestBody.pp_ResponseMessage
                }
            })

            console.log('💾 Transaction updated to completed status');

            if (txn?.status != "completed") {
                console.log('🔍 Looking up merchant for settlement scheduling');

                const findMerchant = await prisma.merchant.findUnique({
                    where: {
                        merchant_id: txn?.merchant_id
                    },
                    include: {
                        commissions: true
                    }
                })

                console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));

                const scheduledAt = addWeekdays(new Date(), findMerchant?.commissions[0].settlementDuration as number);
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

                console.log('⏰ Scheduling webhook callback in 30 seconds');
                setTimeout(async () => {
                    console.log('📤 Sending delayed webhook callback to merchant');
                    transactionService.sendCallback(
                        findMerchant?.webhook_url as string,
                        txn,
                        (txn?.providerDetails as JsonObject)?.account as string,
                        "payin",
                        findMerchant?.encrypted == "True" ? true : false,
                        false,
                        "success"
                    )
                    console.log('✅ Delayed webhook callback sent');
                }, 30000)
            } else {
                console.log('ℹ️ Transaction already completed, skipping webhook');
            }
        } else {
            console.log('❌ Processing FAILED IPN (Response Code:', requestBody.pp_ResponseCode, ')');

            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: requestBody.pp_TxnRefNo
                        },
                        {
                            transaction_id: requestBody.pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: requestBody.pp_ResponseMessage
                }
            })

            console.log('💾 Transaction updated to failed status');
        }

        const response: PaymentResponse = {
            pp_ResponseCode: "000",
            pp_ResponseMessage: "IPN processed successfully",
            pp_SecureHash: "processed"
        };

        console.log('📤 IPN Response:', JSON.stringify(response, null, 2));
        console.log('=== PROCESS IPN END ===');
        return response;
    } catch (error: any) {
        console.error('❌ Error processing IPN:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== PROCESS IPN END ===');
        throw error;
    }
}

const processCardIPN = async (requestBody: { data: any }): Promise<PaymentResponse> => {
    try {
        console.log('=== PROCESS CARD IPN START ===');
        console.log('📥 Card IPN Request Body:', JSON.stringify(requestBody, null, 2));

        const bytes = CryptoJS.AES.decrypt(requestBody?.data, process.env.ENCRYPTION_KEY as string);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        console.log('🔓 Decrypted data:', decrypted);

        const { pp_TxnRefNo, pp_ResponseCode, pp_ResponseMessage } = JSON.parse(decrypted);
        console.log('🔍 Extracted data:', { pp_TxnRefNo, pp_ResponseCode, pp_ResponseMessage });

        const txn = await prisma.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: pp_TxnRefNo
                    },
                    {
                        transaction_id: pp_TxnRefNo
                    }
                ]
            },
            include: {
                merchant: true
            }
        })

        console.log('💾 Transaction found:', JSON.stringify(txn, null, 2));

        if (!txn) {
            console.log('❌ Transaction Not Found for reference:', pp_TxnRefNo);
            throw new CustomError("Transaction Not Found", 500);
        }

        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: txn?.merchant?.id
            }
        })

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        if (pp_ResponseCode == "121") {
            console.log('✅ Processing SUCCESS Card IPN (Response Code: 121)');

            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: pp_TxnRefNo
                        },
                        {
                            transaction_id: pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "completed",
                    response_message: pp_ResponseMessage
                }
            })

            console.log('💾 Transaction updated to completed status');

            if (txn?.status != "completed") {
                console.log('📤 Sending webhook callback to merchant');
                await transactionService.sendCallback(
                    merchant?.webhook_url as string,
                    txn,
                    (txn?.providerDetails as JsonObject)?.account as string,
                    "payin",
                    merchant?.encrypted == "True" ? true : false,
                    false,
                    "success"
                )
                console.log('✅ Webhook callback sent successfully');
            } else {
                console.log('ℹ️ Transaction already completed, skipping webhook');
            }
        } else {
            console.log('❌ Processing FAILED Card IPN (Response Code:', pp_ResponseCode, ')');

            await prisma.transaction.updateMany({
                where: {
                    OR: [
                        {
                            merchant_transaction_id: pp_TxnRefNo
                        },
                        {
                            transaction_id: pp_TxnRefNo
                        }
                    ]
                },
                data: {
                    status: "failed",
                    response_message: pp_ResponseMessage
                }
            })

            console.log('💾 Transaction updated to failed status');
        }

        const response: PaymentResponse = {
            pp_ResponseCode: "000",
            pp_ResponseMessage: "Card IPN processed successfully",
            pp_SecureHash: "processed"
        };

        console.log('📤 Card IPN Response:', JSON.stringify(response, null, 2));
        console.log('=== PROCESS CARD IPN END ===');
        return response;
    } catch (error: any) {
        console.error('❌ Error processing Card IPN:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== PROCESS CARD IPN END ===');
        throw error;
    }
}

const updateWooOrderStatus = async (wooId: number, orderId: string, responseCode: string) => {
    try {
        console.log("Update Method")
        const wooMerchant = await prisma.woocommerceMerchants.findUnique({
            where: {
                id: wooId
            }
        });
        console.log(wooMerchant)
        if (!wooMerchant) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        orderId = extractOrderNumberFromTxnId(orderId) as string
        console.log(orderId)
        if (!orderId) {
            throw new CustomError("Woo Commerce Merchant Not Assigned", 500);
        }
        const res = await axios.put(`${wooMerchant?.baseUrl}/wp-json/wc/v3/orders/${orderId}`, {
            status: responseCode == "000" ? "completed" : "failed"
        },
            {
                headers: {
                    Authorization: `Basic ${toBase64(`${wooMerchant?.username}:${wooMerchant?.password}`)}`
                }
            })
        return res;
    }
    catch (err: any) {

    }
}

function extractOrderNumberFromTxnId(txnId: string) {
    const wpIndex = txnId.indexOf('WP');
    if (wpIndex === -1) return null; // WP not found

    // Extract everything after 'WP'
    return txnId.substring(wpIndex + 2);
}

function toBase64(str: string) {
    return Buffer.from(str).toString('base64');
}

const bdtIPN = (body: any) => {
    console.log('=== BDT IPN START ===');
    console.log('📥 BDT IPN Body:', JSON.stringify(body, null, 2));
    console.log('=== BDT IPN END ===');
    return body;
}

interface IPNResult {
    statusCode: number
    body: any
}

const shurjopayIPN = async (data: any): Promise<IPNResult> => {
    console.log('=== SHURJOPAY IPN START ===');
    // console.log('📥 ShurjoPay IPN Data:', JSON.stringify(data, null, 2));

    const payload = data.body
    // console.log('🔍 ShurjoPay Payload:', JSON.stringify(payload, null, 2));

    // 1. Validate input
    if (!payload.order_id) {
        console.log('❌ Missing required field: order_id');
        console.log('=== SHURJOPAY IPN END ===');
        return {
            statusCode: 400,
            body: { error: "Missing required field: order_id" }
        }
    }

    // 2. Look up the transaction
    console.log('🔍 Looking up transaction for order_id:', payload.order_id);

    const fetchedTxn = await prisma.transaction.findFirst({
        where: {
            providerDetails: {
                path: ["transactionId"],
                equals: payload.order_id,
            },
        },
        include: {
            merchant: true
        }
    })

    console.log('💾 Transaction found:', JSON.stringify(fetchedTxn, null, 2));

    if (!fetchedTxn) {
        console.log('❌ No transaction found for order_id:', payload.order_id);
        console.log('=== SHURJOPAY IPN END ===');
        return {
            statusCode: 404,
            body: { error: "No transaction found for provided order_id" }
        }
    }

    const findMerchant = await prisma.merchant.findUnique({
        where: {
            merchant_id: fetchedTxn?.merchant_id
        }
    })

    console.log('🏪 Merchant found:', JSON.stringify(findMerchant, null, 2));

    // 3. Update status
    let newStatus: string;
    if (payload.status.toLowerCase() === "success") {
        newStatus = "completed";
    } else if (payload.status.toLowerCase() === "initiate") {
        newStatus = "pending";
    } else {
        newStatus = "failed";
    }

    console.log('🔄 Updating transaction status to:', newStatus);

    await prisma.transaction.update({
        where: { transaction_id: fetchedTxn.transaction_id },
        data: {
            status: newStatus as any,
            response_message: payload.sp_message,
        }
    })

    console.log('💾 Transaction status updated successfully');

    if (newStatus === "completed") {
        const scheduledAt = addWeekdays(new Date(), 1);
        console.log('📅 Creating scheduled task for:', scheduledAt);

        let scheduledTask = await prisma?.scheduledTask.create({
            data: {
                transactionId: fetchedTxn?.transaction_id,
                status: 'pending',
                scheduledAt: scheduledAt,
                executedAt: null,
            }
        });

        console.log('📋 Scheduled task created:', JSON.stringify(scheduledTask, null, 2));
    }

    setTimeout(async () => {
        console.log('📤 Sending delayed webhook callback to merchant');
        transactionService.sendCallback(
            findMerchant?.webhook_url as string,
            fetchedTxn,
            (fetchedTxn?.providerDetails as JsonObject)?.account as string,
            "payin",
            findMerchant?.encrypted == "True" ? true : false,
            false,
            newStatus == 'completed' ? "success" : 'failed'
        )
        console.log('✅ Delayed webhook callback sent');
    }, 30000)

    const result = {
        statusCode: 200,
        body: { message: "IPN processed successfully" }
    };

    console.log('📤 ShurjoPay IPN Response:', JSON.stringify(result, null, 2));
    console.log('=== SHURJOPAY IPN END ===');
    return result;
}

const bkashSetupIPN = async (body: any): Promise<IPNResult> => {
    console.log('=== BKASH SETUP IPN START ===');
    console.log('📥 BKash Setup IPN Body:', JSON.stringify(body, null, 2));

    // Validate input
    const paymentID: string | undefined = body?.paymentID || body?.transaction?.paymentID;
    const merchantInvoiceNumber: string | undefined = body?.transaction?.merchantInvoiceNumber;

    if (!paymentID && !merchantInvoiceNumber) {
        console.log('❌ Missing identifiers: paymentID or transaction.merchantInvoiceNumber is required');
        console.log('=== BKASH SETUP IPN END ===');
        return { statusCode: 400, body: { error: 'paymentID or transaction.merchantInvoiceNumber is required' } };
    }

    // Find transaction either by providerDetails.transaction_id or by merchant_transaction_id
    console.log('🔍 Looking up transaction by paymentID/merchantInvoiceNumber');
    const fetchedTxn = await prisma.transaction.findFirst({
        where: {
            OR: [
                paymentID ? {
                    providerDetails: {
                        path: ["transaction_id"],
                        equals: paymentID,
                    },
                } : undefined,
                merchantInvoiceNumber ? {
                    merchant_transaction_id: merchantInvoiceNumber,
                } : undefined,
            ].filter(Boolean) as any,
        },
        include: { merchant: true },
    });

    console.log('💾 Transaction found:', JSON.stringify(fetchedTxn, null, 2));

    if (!fetchedTxn) {
        console.log('❌ No transaction found for provided identifiers');
        console.log('=== BKASH SETUP IPN END ===');
        return { statusCode: 404, body: { error: 'No transaction found for provided identifiers' } };
    }

    // Decide success/failure
    const statusUpper = (body?.status || '').toString().toUpperCase();
    const txnStatusUpper = (body?.transaction?.transactionStatus || '').toString().toUpperCase();
    const isSuccess = ["SUCCESS", "COMPLETED"].includes(statusUpper) || ["SUCCESS", "COMPLETED"].includes(txnStatusUpper);
    const newStatus = isSuccess ? 'completed' : 'failed';
    const responseMessage = body?.bkashResponse?.statusMessage || body?.transaction?.statusMessage || body?.status || 'BKash Setup IPN';

    console.log('🔄 Updating transaction status to:', newStatus);
    await prisma.transaction.update({
        where: { transaction_id: fetchedTxn.transaction_id },
        data: {
            status: newStatus as any,
            response_message: responseMessage,
        },
    });

    console.log('💾 Transaction status updated successfully');

    if (fetchedTxn?.status !== 'completed' && isSuccess) {
        const scheduledAt = addWeekdays(new Date(), 1);
        console.log('📅 Creating scheduled task for:', scheduledAt);
        await prisma.scheduledTask.create({
            data: {
                transactionId: fetchedTxn.transaction_id,
                status: 'pending',
                scheduledAt,
                executedAt: null,
            },
        });

        console.log('📋 Scheduled task created');

    }
    const findMerchant = await prisma.merchant.findUnique({
        where: {
            merchant_id: fetchedTxn?.merchant_id
        }
    })
    await transactionService.sendCallback(
        (findMerchant?.webhook_url as string),
        fetchedTxn,
        (fetchedTxn?.providerDetails as JsonObject)?.account as string,
        "payin",
        findMerchant?.encrypted == "True" ? true : false,
        false,
        newStatus == 'completed' ? 'success' : 'failed'
    )

    const result = { statusCode: 200, body: { message: 'IPN processed successfully' } };
    console.log('📤 BKash Setup IPN Response:', JSON.stringify(result, null, 2));
    console.log('=== BKASH SETUP IPN END ===');
    return result;
}

export default { processIPN, processCardIPN, bdtIPN, shurjopayIPN, bkashSetupIPN };