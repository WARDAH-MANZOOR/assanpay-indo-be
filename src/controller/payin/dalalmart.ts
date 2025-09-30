import { Request, Response } from "express";
import axios from "axios";
import FormData from "form-data"
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { addWeekdays } from "../../utils/date_method.js";
import { PROVIDERS } from "../../constants/providers.js";

const createTxn = async (obj: any) => {
    let settledAmount = obj.amount * (1 - obj.commission);
    let data: { transaction_id?: string; merchant_transaction_id?: string; } = {}
    // if (params.order_id) {
    data["merchant_transaction_id"] = obj.order_id;
    // }
    // else {
    // data["merchant_transaction_id"] = id;
    // }
    data["transaction_id"] = obj.transaction_id;
    return await prisma?.$transaction(async (tx: Prisma.TransactionClient) => {
        try {
            return await tx.transaction.create({
                data: {
                    // order_id: obj.order_id,
                    ...data,
                    date_time: new Date(),
                    original_amount: obj.amount,
                    type: obj.type,
                    status: obj.status,
                    merchant_id: obj.merchant_id,
                    settled_amount: settledAmount,
                    balance: settledAmount,
                    providerDetails: obj.providerDetails,
                    response_message: obj.response_message
                },
            });
        }
        catch (err) {
            console.log(err)
            throw new Error("Transaction not Created")
        }
    });
};

const createTransactionId = () => {
    const currentTime = Date.now();
    const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
    const fractionalMilliseconds = Math.floor(
        (currentTime - Math.floor(currentTime)) * 1000
    );

    const txnRefNo = `DEV-${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
    return txnRefNo;
}

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
const dalalMartPayin = async (req: Request, res: Response) => {
    try {
        console.log('=== DALALMART PAYIN CONTROLLER START ===');
        console.log('Request Payload:', JSON.stringify(req.body, null, 2));
        console.log('Request Params:', JSON.stringify(req.params, null, 2));
        
        const { merchantId } = req.params;
        const merchant = await prisma?.merchant.findFirst({
            where: {
                uid: merchantId
            },
            include: {
                commissions: true
            }
        })

        if (!merchant) {
            console.log('❌ Merchant Not Found for ID:', merchantId);
            return res.status(400).json({ status: "error", message: 'Merchant Not Found' });
        }
        let {
            amount, order_id, phone, payment_method
        } = req.body;

        if (!amount || !payment_method) {
            console.log('❌ Missing required fields:', { amount, payment_method });
            return res.status(400).json({ status: "error",message: 'amount, phone, type and redirect_url are required' });
        }

        let id = createTransactionId()
        order_id = order_id || id;

        console.log('📝 Creating transaction with ID:', id);

        const txn = await createTxn({
            order_id: order_id,
            transaction_id: id,
            amount: amount,
            status: "pending",
            type: "wallet",
            merchant_id: merchant?.merchant_id,
            commission: merchant?.commissions[0]?.commissionRate,
            settlementDuration: merchant?.commissions[0]?.settlementDuration,
            providerDetails: {
                id: 1,
                name: payment_method == "bkash" ? PROVIDERS.BKASH : PROVIDERS.NAGAD,
                msisdn: phone,
                sub_name: "DALALMART"
            },
        })

        console.log('💾 Transaction Created:', JSON.stringify(txn, null, 2));

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

        console.log('🔑 Requesting DalalMart Token...');

        let token = await axios.request(tokenConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
            
        console.log('🔑 DalalMart Token Response:', JSON.stringify(token, null, 2));
        
        if (!token?.access_token) {
            console.log('❌ No Token Received from DalalMart');
            await updateTxn(
                txn?.transaction_id as string,
                {
                    response_message: token.message,
                    status: "failed",
                },
                1
            )
            console.log('=== DALALMART PAYIN CONTROLLER END ===');
            return res.status(500).json({ status: "error", message: "No Token Recieved" })
        }

        let depositData = JSON.stringify({
            "trxId": `${order_id}`,
            "amount": req.body.amount,
            "customer_name": "Test Name",
            "mobile_no": "000000000000",
            "email": "a@example.com"
        });

        console.log('📤 DalalMart Deposit Payload:', JSON.stringify(JSON.parse(depositData), null, 2));

        let depositConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://live.dalalmart.com/api/paymentroute/payment-init',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token?.access_token}`,
            },
            data: depositData
        };

        console.log('🚀 Initiating DalalMart Payment...');

        let depositResult = await axios.request(depositConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });

        console.log('📥 DalalMart Payment Response:', JSON.stringify(depositResult, null, 2));

        if (depositResult?.code != 200) {
            console.log('❌ DalalMart Payment Failed:', depositResult?.message);
            await updateTxn(
                txn?.transaction_id as string,
                {
                    response_message: depositResult.message,
                    status: "failed",
                },
                1
            )
            console.log('=== DALALMART PAYIN CONTROLLER END ===');
            return res.status(500).json({ status: "error", message: depositResult?.message })
        }
        
        console.log('✅ DalalMart Payment Success');
        console.log('=== DALALMART PAYIN CONTROLLER END ===');
        
        return res.status(200).json({ status: 'success', data: {
            url: depositResult?.redirect_url[`${payment_method}Url`],
            status: "Pending",
            reference: order_id
        }, message: 'Direct payment initiated successfully' });
    }
    catch (err: any) {
        console.error('❌ DalalMart Payin Error:', err?.message);
        console.error('Error Details:', JSON.stringify(err, null, 2));
        console.log('=== DALALMART PAYIN CONTROLLER END ===');
        return res.status(500).json({ status: "error", message: err?.message })
    }
}

export default {
    dalalMartPayin
}