import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import FormData from "form-data";

interface ShurjoPayVerificationResponse {
    id: number;
    order_id: string;
    currency: string;
    amount: string;
    payable_amount: string;
    discount_amount: string;
    disc_percent: number;
    recived_amount: string;
    usd_amt: string;
    usd_rate: number;
    card_holder_name: string | null;
    card_number: string | null;
    phone_no: string | null;
    bank_trx_id: string;
    invoice_no: string;
    bank_status: string;
    customer_order_id: string;
    sp_code: string;
    sp_massage: string;
    sp_message: string;
    name: string;
    email: string;
    address: string;
    city: string;
    value1: string | null;
    value2: string | null;
    value3: string | null;
    value4: string | null;
    transaction_status: string;
    method: string | null;
    date_time: string;
}

export const shurjoPayStatusInquiry = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== SHURJOPAY STATUS INQUIRY CONTROLLER START ===');
        console.log('Request Query:', JSON.stringify(req.query, null, 2));
        console.log('Request Params:', JSON.stringify(req.params, null, 2));
        
        const { ref } = req.query;
        const { merchantId } = req.params;
        
        if (!ref || typeof ref !== 'string') {
            console.log('❌ Missing or invalid ref query parameter');
            res.status(400).json({ error: 'ref query parameter is required and must be a string' });
            return;
        }
        const order_id = ref;
        if (!merchantId) {
            console.log('❌ Missing merchant id parameter');
            res.status(400).json({ error: "merchant id is required" });
            return;
        }

        console.log('🔍 Looking up merchant for ID:', merchantId);

        const merchant = await prisma?.merchant.findFirst({
            where: {
                uid: merchantId
            },
            select: {
                merchant_id: true,
                depositInquiryMethod: true,
                depositMethod: true
            }
        });

        console.log('🏪 Merchant found:', JSON.stringify(merchant, null, 2));

        // Check if merchant is configured for ShurjoPay
        if (merchant?.depositMethod !== "SHURJOPAY") {
            console.log('❌ Merchant not configured for ShurjoPay');
            res.status(400).json({ error: "Merchant not configured for ShurjoPay" });
            return;
        }

        // First, query the transactions table by order_id on transaction_id column
        console.log('🔍 Querying transactions table for order_id:', order_id);
        
        const transaction = await prisma?.transaction.findFirst({
            where: {
                merchant_transaction_id: order_id
            },
            select: {
                merchant_transaction_id: true,
                providerDetails: true,
                merchant_id: true,
                original_amount: true,
                status: true
            }
        });

        if (!transaction) {
            console.log('❌ Transaction not found for order_id:', order_id);
            res.status(404).json({ 
                status: 'error', 
                message: 'Transaction not found' 
            });
            return;
        }

        console.log('💾 Transaction found:', JSON.stringify(transaction, null, 2));

        // Verify that the transaction belongs to the specified merchant
        if (transaction.merchant_id !== merchant.merchant_id) {
            console.log('❌ Transaction does not belong to the specified merchant');
            console.log('❌ Transaction merchant_id:', transaction.merchant_id, 'Requested merchant_id:', merchant.merchant_id);
            res.status(403).json({ 
                status: 'error', 
                message: 'Transaction does not belong to the specified merchant' 
            });
            return;
        }

        // Extract transactionId from providerDetails object
        const providerDetails = transaction.providerDetails as any;
        if (!providerDetails || !providerDetails.transactionId) {
            console.log('❌ No transactionId found in providerDetails');
            res.status(400).json({ 
                status: 'error', 
                message: 'No ShurjoPay transaction ID found in transaction details' 
            });
            return;
        }

        const shurjoPayTransactionId = providerDetails.transactionId;
        console.log('🔍 Using ShurjoPay transaction ID:', shurjoPayTransactionId);

        // Now, try to get token from ShurjoPay
        console.log('🔑 Getting ShurjoPay token...');
        
        const loginPayload = {
            username: process.env.SJ_USERNAME,
            password: process.env.SJ_PASSWORD,
        };

        const loginResp = await axios.post(
            `${process.env.SJ_BASE_URL}/get_token`,
            loginPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            }
        );

        console.log('🔑 ShurjoPay Login Response:', JSON.stringify(loginResp.data, null, 2));

        const { token, token_type } = loginResp.data as {
            token: string;
            token_type: string;
            execute_url: string;
            store_id: number;
        };

        // Now make the verification request using the transactionId from providerDetails
        console.log('🔍 Making ShurjoPay verification request for transactionId:', shurjoPayTransactionId);
        
        // Try different possible verification endpoints
        const possibleUrls = [
            `${process.env.SJ_BASE_URL}/verification`,
        ];
        
        console.log('🔍 Possible verification URLs:', possibleUrls);
        
        console.log('📤 Verification Request Details:');
        console.log('  Headers:', {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Authorization": `${token_type} ${token}`,
        });
        console.log('  Request Body:', { order_id: shurjoPayTransactionId });
        
        // Try each URL with different methods
        let verificationResponse: any;
        let lastError: any;
        
        for (const verificationUrl of possibleUrls) {
            console.log(`🔍 Trying URL: ${verificationUrl}`);
            
            try {
                // Try with Bearer token and JSON body (POST)
                console.log('🔍 Trying POST with Bearer token and JSON body...');
                verificationResponse = await axios.post(
                    verificationUrl,
                    { order_id: shurjoPayTransactionId },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                            "Authorization": `${token_type} ${token}`,
                        },
                    }
                );
                
                // If we get here, the request was successful
                console.log(`✅ Success with POST and URL: ${verificationUrl}`);
                break;
                
            } catch (error: any) {
                console.log(`❌ POST failed with URL ${verificationUrl}:`, error.response?.status, error.response?.data);
                console.log(`❌ Error details:`, error.response?.statusText, error.response?.headers);
                lastError = error;
                
                // Try with GET method
                try {
                    console.log('🔍 Trying GET method...');
                    verificationResponse = await axios.get(
                        `${verificationUrl}?order_id=${shurjoPayTransactionId}`,
                        {
                            headers: {
                                "Accept": "application/json",
                                "Authorization": `${token_type} ${token}`,
                            },
                        }
                    );
                    
                    console.log(`✅ Success with GET and URL: ${verificationUrl}`);
                    break;
                    
                } catch (getError: any) {
                    console.log(`❌ GET failed with URL ${verificationUrl}:`, getError.response?.status, getError.response?.data);
                    lastError = getError;
                    
                    // Try with form data (POST)
                    try {
                        console.log('🔍 Trying POST with form data...');
                        const formData = new FormData();
                        formData.append('order_id', shurjoPayTransactionId);
                        
                        verificationResponse = await axios.post(
                            verificationUrl,
                            formData,
                            {
                                headers: {
                                    "Accept": "application/json",
                                    "Authorization": `${token_type} ${token}`,
                                    ...formData.getHeaders(),
                                },
                            }
                        );
                        
                        console.log(`✅ Success with form data and URL: ${verificationUrl}`);
                        break;
                        
                    } catch (formError: any) {
                        console.log(`❌ Form data failed with URL ${verificationUrl}:`, formError.response?.status, formError.response?.data);
                        lastError = formError;
                    }
                }
            }
        }
        
        if (!verificationResponse) {
            console.log('❌ All URLs and methods failed');
            console.log('❌ Last error details:', lastError?.response?.status, lastError?.response?.data, lastError?.response?.statusText);
            throw lastError;
        }

        console.log('📥 ShurjoPay Verification Response:', JSON.stringify(verificationResponse.data, null, 2));

        if (verificationResponse.data && Array.isArray(verificationResponse.data) && verificationResponse.data.length > 0) {
            const verificationData = verificationResponse.data[0] as ShurjoPayVerificationResponse;
            
            console.log('✅ ShurjoPay Verification Success');
            
            // Map the response to match our standard format
            const responseData = {
                status: 'success',
                data: {
                    reference: verificationData.order_id,
                    payment_method: verificationData.method || "ShurjoPay",
                    trxID: verificationData.bank_trx_id || verificationData.invoice_no,
                    payment_id: verificationData.customer_order_id,
                    currency: verificationData.currency,
                    amount: parseFloat(verificationData.amount),
                    transactionStatus: verificationData.sp_code === "1000" ? "Success" : 
                                    verificationData.sp_code === "1001" ? "Declined" :
                                    verificationData.sp_code === "1002" ? "Cancelled" : "Pending",
                },
                message: 'Payment status retrieved successfully'
            };
            
            console.log('✅ ShurjoPay Status Inquiry Success:', JSON.stringify(responseData, null, 2));
            console.log('=== SHURJOPAY STATUS INQUIRY CONTROLLER END ===');
            
            res.status(200).json(responseData);
        } else {
            console.log('❌ ShurjoPay Verification - No data returned');
            console.log('=== SHURJOPAY STATUS INQUIRY CONTROLLER END ===');
            
            res.status(404).json({ 
                status: 'error', 
                message: 'Transaction not found or verification failed', 
                data: verificationResponse.data 
            });
        }

    } catch (error: any) {
        console.error('❌ Error in ShurjoPay status inquiry:', error.message);
        console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
        console.log('=== SHURJOPAY STATUS INQUIRY CONTROLLER END ===');
        
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json({ 
                status: 'error', 
                message: 'ShurjoPay verification failed', 
                data: error.response.data 
            });
        } else {
            res.status(500).json({ 
                status: 'error', 
                message: error.message || 'Internal server error' 
            });
        }
    }
};

export default {
    shurjoPayStatusInquiry
};
