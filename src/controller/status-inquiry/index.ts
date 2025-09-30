import { JsonObject } from "@prisma/client/runtime/library";
import axios from "axios";
import { dalalmartStatusInquiry, shurjoPayStatusInquiry } from "../../controller/index.js";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";

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

const payinInquiry = async (req: Request, res: Response) => {
    try {
        console.log('=== PAYIN INQUIRY CONTROLLER START ===');
        console.log('Request Query:', JSON.stringify(req.query, null, 2));
        console.log('Request Params:', JSON.stringify(req.params, null, 2));
        
        const { ref } = req.query;
        const { merchantId } = req.params;
        
        if (!ref) {
            console.log('❌ Missing ref query parameter');
            return res.status(400).json({ error: 'ref query parameter is required' });
        }
        if (!merchantId) {
            console.log('❌ Missing merchant id parameter');
            return res.status(400).json({ error: "merchant id is required" });
        }

        console.log('🔍 Looking up merchant for ID:', merchantId);

        const merchant = await prisma?.merchant.findFirst({
            where: {
                uid: merchantId
            },
            select: {
                depositInquiryMethod: true,
                depositMethod: true
            }
        })

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        const transaction = await prisma?.transaction.findFirst({
            where: {
                OR: [
                    {
                        merchant_transaction_id: ref as string
                    },
                    {
                        transaction_id: ref as string
                    }
                ]
            }
        })

        console.log('💾 Transaction found:', JSON.stringify(transaction, null, 2));

        if (merchant?.depositInquiryMethod == "WALLET") {
            console.log('🔧 Using WALLET inquiry method');
            
            if (merchant?.depositMethod == "PAYINX") {
                console.log('🚀 Routing to PAYINX inquiry');
                
                console.log('📤 PayinX Inquiry Request URL:', `${process.env.PAYINX_BASE_URL}/api/v1/cash_check?ref=${ref}`);
                
                const response = await axios.get(
                    `${process.env.PAYINX_BASE_URL}/api/v1/cash_check?ref=${ref}`,
                    { headers: getHeaders() }
                );

                console.log('📥 PayinX Inquiry Response:', JSON.stringify(response.data, null, 2));

                if (response.data.status === 200 || response.data.status === 201) {
                    if (response.data.data.length > 0) {
                        console.log('✅ PayinX Inquiry Success - Transaction Found');
                        delete response.data.data[0].callback_url;
                        console.log('=== PAYIN INQUIRY CONTROLLER END ===');
                        return res.status(200).json({ status: 'success', data: { ...response.data.data[0] }, message: 'Payment status retrieved successfully' });
                    }
                    else {
                        console.log('❌ PayinX Inquiry - Transaction Not Found');
                        console.log('=== PAYIN INQUIRY CONTROLLER END ===');
                        return res.status(response.data.status).json({ status: 'error', message: 'Transaction Not Found', data: response.data });
                    }
                } else {
                    console.log('❌ PayinX Inquiry Failed:', response.data);
                    console.log('=== PAYIN INQUIRY CONTROLLER END ===');
                    return res.status(response.data.status).json({ status: 'error', message: 'Failed to retrieve payment status', data: response.data });
                }
            }
            else if (merchant?.depositMethod == "SHURJOPAY") {
                console.log('🚀 Routing to SHURJOPAY inquiry');
                await shurjoPayStatusInquiry.shurjoPayStatusInquiry(req, res);
                return;
            }
            else {
                console.log('🚀 Routing to DALALMART inquiry');
                await dalalmartStatusInquiry.dalalMartPayinStatusInquiry(req, res)
            }
        }
        else {
            console.log('🔧 Using DATABASE inquiry method');
            
            let txn = await prisma?.transaction.findUnique({
                where: {
                    merchant_transaction_id: ref as string
                }
            });
            
            console.log('💾 Database Transaction found:', JSON.stringify(txn, null, 2));
            
            if (!txn) {
                console.log('❌ Transaction Not Found in Database');
                console.log('=== PAYIN INQUIRY CONTROLLER END ===');
                return res.status(400).json({ status: 'error', message: 'Transaction Not Found', data: {} });
            }
            
            const responseData = {
                status: 'success', 
                data: {
                    "reference": txn?.merchant_transaction_id,
                    "payment_method": (txn?.providerDetails as JsonObject)?.name,
                    "trxID": "",
                    "payment_id": "",
                    "currency": "BDT",
                    "amount": txn?.original_amount,
                    "transactionStatus": txn?.status == "completed" ? "Success" : txn?.status.slice(0, 1).toLocaleUpperCase() + txn?.status?.slice(1)
                }, 
                message: 'Payment status retrieved successfully'
            };
            
            console.log('✅ Database Inquiry Success:', JSON.stringify(responseData, null, 2));
            console.log('=== PAYIN INQUIRY CONTROLLER END ===');
            return res.status(200).json(responseData);
        }
    } catch (error: any) {
        console.error('❌ Error checking payment status:', error.message);
        console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
        console.log('=== PAYIN INQUIRY CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: error.message, data: error.response?.data });
    }
}

const payoutInquiry = async (req: Request, res: Response) => {
    try {
        console.log('=== PAYOUT INQUIRY CONTROLLER START ===');
        console.log('Request Query:', JSON.stringify(req.query, null, 2));
        console.log('Request Params:', JSON.stringify(req.params, null, 2));
        
        const { payment_id } = req.query;
        const { merchantId } = req.params;
        
        if (!payment_id) {
            console.log('❌ Missing payment_id query parameter');
            return res.status(400).json({ error: 'payment_id query parameter is required' });
        }
        if (!merchantId) {
            console.log('❌ Missing merchant id parameter');
            return res.status(400).json({ error: "merchant id is required" });
        }

        console.log('🔍 Looking up merchant for ID:', merchantId);

        const merchant = await prisma?.merchant.findFirst({
            where: {
                uid: merchantId
            },
            select: {
                withdrawalInquiryMethod: true,
                withdrawalMethod: true
            }
        })

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        if (merchant?.withdrawalInquiryMethod == "WALLET") {
            console.log('🔧 Using WALLET inquiry method');
            
            if (merchant?.withdrawalMethod == "PAYINX") {
                console.log('🚀 Routing to PAYINX inquiry');
                
                const [orderId] = (payment_id as string)?.split('-') || [];
                console.log('🔍 Extracted orderId from payment_id:', orderId);
                
                const txn = await prisma?.disbursement.findFirst({
                    where: {
                        OR: [
                            { merchant_custom_order_id: orderId },
                            { system_order_id: orderId }
                        ]
                    }
                })
                
                console.log('💾 Disbursement found:', JSON.stringify(txn, null, 2));
                
                console.log('📤 PayinX Payout Inquiry Request URL:', `${process.env.PAYINX_BASE_URL}/api/v1/payout_check?payment_id=${txn?.transaction_id}`);
                
                const response = await axios.post(
                    `${process.env.PAYINX_BASE_URL}/api/v1/payout_check?payment_id=${txn?.transaction_id}`,
                    {},
                    { headers: getHeaders(true) }
                );

                console.log('📥 PayinX Payout Inquiry Response:', JSON.stringify(response.data, null, 2));

                if (response.data.status === 200 || response.data.status === 201) {
                    console.log('✅ PayinX Payout Inquiry Success');
                    delete response?.data?.data["callback_url"]
                    console.log('=== PAYOUT INQUIRY CONTROLLER END ===');
                    return res.status(200).json({ status: 'success', data: response.data, message: 'Payout status retrieved successfully' });
                } else {
                    console.log('❌ PayinX Payout Inquiry Failed:', response.data);
                    console.log('=== PAYOUT INQUIRY CONTROLLER END ===');
                    return res.status(response.data.status).json({ status: 'error', message: 'Failed to retrieve payout status', data: response.data });
                }
            }
            else {
                console.log('🚀 Routing to DALALMART inquiry');
                await dalalmartStatusInquiry.dalalMartPayoutStatusInquiry(req,res)
            }
        }
        else {
            console.log('🔧 Using DATABASE inquiry method');
            
            let txn = await prisma?.disbursement.findUnique({
                where: {
                    merchant_custom_order_id: payment_id as string
                }
            });
            
            console.log('💾 Database Disbursement found:', JSON.stringify(txn, null, 2));
            
            if (!txn) {
                console.log('❌ Disbursement Not Found in Database');
                console.log('=== PAYOUT INQUIRY CONTROLLER END ===');
                return res.status(400).json({ status: 'error', message: 'Transaction Not Found', data: {} });
            }
            
            const responseData = {
                status: 'success', 
                data: {
                    status: 200,
                    data: {
                        "status": txn?.status == "completed" ? "Success" : txn?.status.slice(0, 1).toLocaleUpperCase() + txn?.status?.slice(1),
                        "payment_id": "",
                        "trxID": txn?.transaction_id,
                        "amount": txn?.transactionAmount,
                        "currency": "BDT",
                        "payment_method": "",
                        "withdraw_number": "",
                        "reference": txn?.merchant_custom_order_id,
                        "note": null
                    }
                }, 
                message: 'Payment status retrieved successfully'
            };
            
            console.log('✅ Database Payout Inquiry Success:', JSON.stringify(responseData, null, 2));
            console.log('=== PAYOUT INQUIRY CONTROLLER END ===');
            return res.status(200).json(responseData);
        }

    } catch (error: any) {
        console.error('❌ Error checking payout status:', error.message);
        console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
        console.log('=== PAYOUT INQUIRY CONTROLLER END ===');
        return res.status(500).json({ status: 'error', message: error.message, data: error.response?.data });
    }
}

export default {
    payinInquiry, payoutInquiry
}