import axios from "axios";
import { Request, Response } from "express";
import FormData from "form-data";

const dalalMartPayinStatusInquiry = async (req: Request, res: Response) => {
    try {
        console.log('=== DALALMART PAYIN STATUS INQUIRY START ===');
        console.log('Request Query:', JSON.stringify(req.query, null, 2));
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

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        const { ref } = req.query;
        console.log('🔍 Inquiry reference:', ref);

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

        console.log('🔑 Requesting DalalMart Token for inquiry...');

        let token = await axios.request(tokenConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
            
        console.log('🔑 DalalMart Token Response:', JSON.stringify(token, null, 2));
        
        if (!token?.access_token) {
            console.log('❌ No Token Received from DalalMart for inquiry');
            console.log('=== DALALMART PAYIN STATUS INQUIRY END ===');
            return res.status(500).json({ status: "error", message: "No Token Recieved" })
        }

        let inquiryConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://live.dalalmart.com/api/paymentroute/query-txn/${ref}`,
            headers: {
                'Authorization': `Bearer ${token?.access_token}`
            }
        };

        console.log('📤 DalalMart Inquiry Request URL:', inquiryConfig.url);

        let inquiryResponse = await axios.request(inquiryConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
            
        console.log('📥 DalalMart Inquiry Response:', JSON.stringify(inquiryResponse, null, 2));
        
        if (inquiryResponse?.code == 200 || inquiryResponse?.code == 400 || inquiryResponse?.code == 500) {
            console.log('✅ DalalMart Payin Inquiry Success');
            
            const responseData = {
                status: "success", 
                data: {
                    "reference": inquiryResponse?.data?.order_id,
                    "payment_method": inquiryResponse?.data?.txn_processor.toLocaleLowerCase(),
                    "trxID": inquiryResponse?.data?.bank_txn_id,
                    "payment_id": "",
                    "currency": "BDT",
                    "amount": inquiryResponse?.data?.amount,
                    "transactionStatus": inquiryResponse?.data?.txn_status
                }, 
                message: 'Payment status retrieved successfully'
            };
            
            console.log('📤 DalalMart Inquiry Response Data:', JSON.stringify(responseData, null, 2));
            console.log('=== DALALMART PAYIN STATUS INQUIRY END ===');
            return res.status(200).json(responseData);
        }
        else {
            console.log('❌ DalalMart Inquiry Failed:', inquiryResponse);
            console.log('=== DALALMART PAYIN STATUS INQUIRY END ===');
            return res.status(inquiryResponse.code).json({ status: 'error', message: 'Failed to retrieve payment status', data: inquiryResponse.data });
        }
    }
    catch (err: any) {
        console.error('❌ Error checking DalalMart payment status:', err.message);
        console.error('Error Details:', JSON.stringify(err.response?.data, null, 2));
        console.log('=== DALALMART PAYIN STATUS INQUIRY END ===');
        return res.status(500).json({ status: 'error', message: err.message, data: err.response?.data });
    }
}

const dalalMartPayoutStatusInquiry = async (req: Request, res: Response) => {
    try {
        console.log('=== DALALMART PAYOUT STATUS INQUIRY START ===');
        console.log('Request Query:', JSON.stringify(req.query, null, 2));
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

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        const { payment_id } = req.query;
        console.log('🔍 Inquiry payment_id:', payment_id);

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

        console.log('🔑 Requesting DalalMart Token for payout inquiry...');

        let token = await axios.request(tokenConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
            
        console.log('🔑 DalalMart Token Response:', JSON.stringify(token, null, 2));
        
        if (!token?.access_token) {
            console.log('❌ No Token Received from DalalMart for payout inquiry');
            console.log('=== DALALMART PAYOUT STATUS INQUIRY END ===');
            return res.status(500).json({ status: "error", message: "No Token Recieved" })
        }

        let inquiryConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://live.dalalmart.com/api/paymentroute/query-disbursement/${payment_id}`,
            headers: {
                'Authorization': `Bearer ${token?.access_token}`
            }
        };

        console.log('📤 DalalMart Payout Inquiry Request URL:', inquiryConfig.url);

        let inquiryResponse = await axios.request(inquiryConfig)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
            
        console.log('📥 DalalMart Payout Inquiry Response:', JSON.stringify(inquiryResponse, null, 2));
        
        if (inquiryResponse?.code == 200) {
            console.log('✅ DalalMart Payout Inquiry Success');
            
            const responseData = {
                status: "success", 
                data: {
                    status: 200,
                    data: {
                        "status": inquiryResponse?.data?.status.slice(0,1).toLocaleUpperCase() + inquiryResponse?.data?.status.slice(1).toLocaleLowerCase(),
                        "payment_id": "",
                        "trxID": inquiryResponse?.data?.bank_txn_id,
                        "amount": inquiryResponse?.data?.amount,
                        "currency": "BDT",
                        "payment_method": "",
                        "withdraw_number": "",
                        "reference": inquiryResponse?.data?.order_id,
                        "note": null
                    }
                }, 
                message: 'Payment status retrieved successfully'
            };
            
            console.log('📤 DalalMart Payout Inquiry Response Data:', JSON.stringify(responseData, null, 2));
            console.log('=== DALALMART PAYOUT STATUS INQUIRY END ===');
            return res.status(200).json(responseData);
        }
        else {
            console.log('❌ DalalMart Payout Inquiry Failed:', inquiryResponse);
            console.log('=== DALALMART PAYOUT STATUS INQUIRY END ===');
            return res.status(inquiryResponse.code).json({ status: 'error', message: 'Failed to retrieve payment status', data: inquiryResponse.data });
        }
    }
    catch (err: any) {
        console.error('❌ Error checking DalalMart payout status:', err.message);
        console.error('Error Details:', JSON.stringify(err.response?.data, null, 2));
        console.log('=== DALALMART PAYOUT STATUS INQUIRY END ===');
        return res.status(500).json({ status: 'error', message: err.message, data: err.response?.data });
    }
}

export default {
    dalalMartPayinStatusInquiry,
    dalalMartPayoutStatusInquiry
}