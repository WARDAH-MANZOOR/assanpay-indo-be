import { JsonObject } from "@prisma/client/runtime/library"
import axios from "axios"
import { subMinutes } from "date-fns"
import { toZonedTime } from "date-fns-tz" // zonedTimeToUtc نہیں ہے، اس کی جگہ صحیح فنکشن import کریں
import { Request, Response } from "express"
import { transactionService } from "../services/index.js"
import FormData from "form-data"

const getHeaders = (includePublicKey = false) => {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-SECRET-KEY': process.env.PAYINX_SECRET_KEY || '',
    };

    if (includePublicKey) {
        headers['Public-Key'] = process.env.PAYINX_PUBLIC_KEY || '';
        headers['Secret-Key'] = process.env.PAYINX_SECRET_KEY || '';
    }

    return headers;
};
const payinxPayinInquiry = async (body: any) => {
    try {
        const { ref } = body;
        const { merchantId } = body;
        if (!ref) return { error: 'ref query parameter is required' };

        const response = await axios.get(
            `${process.env.PAYINX_BASE_URL}/api/v1/cash_check?ref=${ref}`,
            { headers: getHeaders() }
        );

        if (response.data.status === 200 || response.data.status === 201) {
            console.log(response)
            if (response.data.data.length > 0) {
                delete response.data.data[0].callback_url;
                return { status: 'success', data: { ...response.data.data[0] }, message: 'Payment status retrieved successfully' };
            }
            else {
                return { status: 'error', message: 'Transaction Not Found', data: response.data };
            }
        } else {
            return { status: 'error', message: 'Failed to retrieve payment status', data: response.data };
        }

    } catch (error: any) {
        console.error('Error checking payment status:', error.message);
        return { status: 'error', message: error.message, data: error.response?.data };
    }
}

const dalalMartPayinStatusInquiry = async (body: any) => {
    try {

        const { ref } = body;
        const transaction = await prisma?.transaction.findUnique({
            where: {
                merchant_transaction_id: ref as string
            }
        })

        let tokenData = new FormData();
        tokenData.append('grant_type', 'password');
        tokenData.append('client_id', '9f31a45a-3541-4abf-ac92-f56bb798803d');
        tokenData.append('client_secret', 'WMr9AIVJ8TknW2Pu4aAA3dcz0hzAbb5sFcoiNIJD ');
        tokenData.append('username', '1EwuN17@store.com');
        tokenData.append('password', 'DevTecTsePay@123789.');

        let tokenConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://live.dalalmart.com/oauth/token',
            headers: {
                'Accept': 'application/json',
                ...tokenData.getHeaders()
            },
            data: tokenData
        };

        let token = await axios.request(tokenConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
        console.log(token)
        if (!token?.access_token) {
            return { status: "error", message: "No Token Recieved" }
        }

        let inquiryConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://live.dalalmart.com/api/paymentroute/query-txn/${ref}`,
            headers: {
                'Authorization': `Bearer ${token?.access_token}`
            }
        };

        let inquiryResponse = await axios.request(inquiryConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });

        if (inquiryResponse?.code == 200) {
            return {
                status: "success", data: {
                    "reference": inquiryResponse?.data?.order_id,
                    "payment_method": inquiryResponse?.data?.txn_processor.toLocaleLowerCase(),
                    "trxID": inquiryResponse?.data?.bank_txn_id,
                    "payment_id": "",
                    "currency": "BDT",
                    "amount": inquiryResponse?.data?.amount,
                    "transactionStatus": inquiryResponse?.data?.txn_status
                }, message: 'Payment status retrieved successfully'
            }
        }
        else if (inquiryResponse?.code == 500) {
            return {
                status: 'error', message: 'Transaction Failed', data: {
                    "reference": ref,
                    "payment_method": (transaction?.providerDetails as JsonObject)?.name,
                    "trxID": "",
                    "payment_id": "",
                    "currency": "BDT",
                    "amount": transaction?.original_amount,
                    "transactionStatus": transaction?.status
                }
            };
        }
        else {
            return { status: 'error', message: 'Failed to retrieve payment status', data: inquiryResponse.data };
        }
    }
    catch (err: any) {
        console.error('Error checking payment status:', err.message);
        return { status: 'error', message: err.message, data: err.response?.data };
    }
}

const pendingCron = async (req: Request, res: Response) => {
    // Define PKT timezone
    const PKT_TIMEZONE = 'Asia/Karachi'

    // "zonedTimeToUtc" function is missing, so let's import it from "date-fns-tz"

    // Calculate the UTC equivalent of "now - 15 minutes" in PKT
    const fifteenMinutesAgoPKT = toZonedTime(subMinutes(new Date(), 15), PKT_TIMEZONE)

    console.log(fifteenMinutesAgoPKT)
    const [transactions, disbursements] = await Promise.all([
        prisma?.transaction.findMany({
            where: { status: "pending", date_time: { lt: fifteenMinutesAgoPKT } }
        }),
        prisma?.disbursement.findMany({
            where: {
                status: "pending",
                disbursementDate: {
                    lt: fifteenMinutesAgoPKT
                }
            }
        })
    ])

    console.log("Transactions: ", transactions);
    console.log("Disbursements: ", disbursements);

    // Check if transactions is defined before iterating
    if (transactions && Array.isArray(transactions)) {
        for (let txn of transactions) {
            const findMerchant = await prisma?.merchant.findUnique({
                where: {
                    merchant_id: txn?.merchant_id
                }
            })
            if ((txn?.providerDetails as JsonObject)?.sub_name === "PAYINX") {
                // یہاں آپ اپنی مطلوبہ کارروائی ڈال سکتے ہیں
                // You can add your desired action here
                // let res = await payinxPayinInquiry({ ref: txn?.merchant_transaction_id })

                // if ((res).data.transactionStatus == "Success") {
                //     await prisma?.transaction.update({
                //         where: {
                //             merchant_transaction_id: txn?.merchant_transaction_id as string
                //         },
                //         data: {
                //             status: "completed",
                //             response_message: "completed"
                //         }
                //     });
                //     await transactionService.sendCallback(
                //         (findMerchant?.webhook_url as string),
                //         txn,
                //         (txn?.providerDetails as JsonObject)?.account as string,
                //         "payin",
                //         findMerchant?.encrypted == "True" ? true : false,
                //         false,
                //         "success"
                //     )
                // }
                // else  {
                await prisma?.transaction.updateMany({
                    where: {
                        OR: [
                            {
                                merchant_transaction_id: txn?.merchant_transaction_id as string
                            },
                            {
                                transaction_id: txn?.transaction_id
                            }
                        ]
                    },
                    data: {
                        status: "failed",
                        response_message: "failed"
                    }
                })
                await transactionService.sendCallback(
                    (findMerchant?.webhook_url as string),
                    txn,
                    (txn?.providerDetails as JsonObject)?.account as string,
                    "payin",
                    findMerchant?.encrypted == "True" ? true : false,
                    false,
                    "failed"
                )
            }
            // }
            else {
                //     let res = await dalalMartPayinStatusInquiry({ ref: txn?.merchant_transaction_id });
                //     if ((res).data.transactionStatus == "Success") {
                //         await prisma?.transaction.update({
                //             where: {
                //                 merchant_transaction_id: txn?.merchant_transaction_id as string
                //             },
                //             data: {
                //                 status: "completed",
                //                 response_message: "completed"
                //             }
                //         });
                //         await transactionService.sendCallback(
                //             (findMerchant?.webhook_url as string),
                //             txn,
                //             (txn?.providerDetails as JsonObject)?.account as string,
                //             "payin",
                //             findMerchant?.encrypted == "True" ? true : false,
                //             false,
                //             "success"
                //         )
                //     }
                //     else {
                await prisma?.transaction.updateMany({
                    where: {
                        OR: [
                            {
                                merchant_transaction_id: txn?.merchant_transaction_id as string
                            },
                            {
                                transaction_id: txn?.transaction_id
                            }
                        ]
                    },
                    data: {
                        status: "failed",
                        response_message: "failed"
                    }
                })
                await transactionService.sendCallback(
                    (findMerchant?.webhook_url as string),
                    txn,
                    (txn?.providerDetails as JsonObject)?.account as string,
                    "payin",
                    findMerchant?.encrypted == "True" ? true : false,
                    false,
                    "failed"
                )
            }
        }
        // }
    } else {
        console.warn("No transactions found or transactions is undefined.");
    }
    //         where: { status: "pending", date_time: { lt: fifteenMinutesAgoPKT } },
    //         data: {status: "failed", response_message: "failed"}
    //     }),
    //     prisma?.disbursement.updateMany({
    //         where: {
    //             status: "pending",
    //             disbursementDate: {
    //                 lt: fifteenMinutesAgoPKT
    //             }
    //         },
    //         data: {
    //             status: "failed", response_message: "failed"
    //         }
    //     })
    // ])
    res.status(200).send({ "status": "success" })
}

export default pendingCron