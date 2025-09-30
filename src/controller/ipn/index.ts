import { Request, Response } from "express";
import { ipnService } from "../../services/index.js";
import { PaymentRequestBody } from "../../services/ipn/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const handleIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== HANDLE IPN CONTROLLER START ===');
        console.log('📥 IPN Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📥 IPN Request Headers:', JSON.stringify(req.headers, null, 2));
        
        // Extract the relevant fields from the request body
        const requestBody: PaymentRequestBody = req.body;

        console.log('🔍 Processing IPN for transaction:', requestBody.pp_TxnRefNo);

        // Call the service to process
        const responseData = await ipnService.processIPN(requestBody);

        console.log('📤 IPN Response Data:', JSON.stringify(responseData, null, 2));
        console.log('✅ IPN processed successfully');
        console.log('=== HANDLE IPN CONTROLLER END ===');

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        console.error('❌ Error in handleIPN:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== HANDLE IPN CONTROLLER END ===');
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handleCardIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== HANDLE CARD IPN CONTROLLER START ===');
        console.log('📥 Card IPN Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📥 Card IPN Request Headers:', JSON.stringify(req.headers, null, 2));
        
        // Extract the relevant fields from the request body
        const requestBody = req.body;

        console.log('🔍 Processing Card IPN');

        // Call the service to process
        const responseData = await ipnService.processCardIPN(requestBody);

        console.log('📤 Card IPN Response Data:', JSON.stringify(responseData, null, 2));
        console.log('✅ Card IPN processed successfully');
        console.log('=== HANDLE CARD IPN CONTROLLER END ===');

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        console.error('❌ Error in handleCardIPN:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== HANDLE CARD IPN CONTROLLER END ===');
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};

const handlebdtIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('=== HANDLE BDT IPN CONTROLLER START ===');
        console.log('📥 BDT IPN Request Body:', JSON.stringify(req.body, null, 2));
        console.log('📥 BDT IPN Request Headers:', JSON.stringify(req.headers, null, 2));
        
        // Extract the relevant fields from the request body
        const requestBody = req.body;

        console.log('🔍 Processing BDT IPN');

        // Call the service to process
        const responseData = await ipnService.bdtIPN(requestBody);

        console.log('📤 BDT IPN Response Data:', JSON.stringify(responseData, null, 2));
        console.log('✅ BDT IPN processed successfully');
        console.log('=== HANDLE BDT IPN CONTROLLER END ===');

        // Return response
        res.json(responseData);
    }
    catch (error: any) {
        console.error('❌ Error in handlebdtIPN:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));
        console.log('=== HANDLE BDT IPN CONTROLLER END ===');
        res.status(500).json(ApiResponse.error(error.message,500));
    }
};


const handleShurjopayIPN = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== HANDLE SHURJOPAY IPN CONTROLLER START ===');
    // console.log('📥 ShurjoPay IPN Request Query:', JSON.stringify(req.query, null, 2));
    // console.log('📥 ShurjoPay IPN Request Body:', JSON.stringify(req.body, null, 2));
    // console.log('📥 ShurjoPay IPN Request Headers:', JSON.stringify(req.headers, null, 2));
    
    const payload = { ...req.query, body: req.body };
    console.log('🔍 ShurjoPay IPN Payload:', JSON.stringify(payload, null, 2));
    
    const result = await ipnService.shurjopayIPN(payload);
    console.log("🟢 ShurjoPay IPN Result:", JSON.stringify(result, null, 2));
    console.log('✅ ShurjoPay IPN processed successfully');
    console.log('=== HANDLE SHURJOPAY IPN CONTROLLER END ===');

    // 🔹 No return here:
    res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error("🔴 IPN Handler error:", err.message);
    console.error('Error Details:', JSON.stringify(err, null, 2));
    console.log('=== HANDLE SHURJOPAY IPN CONTROLLER END ===');
    res.status(500).json(ApiResponse.error(err.message || "Internal server error", 500));
  }
};

const handleBkashSetupIPN = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('=== HANDLE BKASH SETUP IPN CONTROLLER START ===');
    console.log('📥 BKash Setup IPN Request Body:', JSON.stringify(req.body, null, 2));

    const result = await ipnService.bkashSetupIPN(req.body);
    res.status(result.statusCode).json(result.body);
    console.log('=== HANDLE BKASH SETUP IPN CONTROLLER END ===');
  } catch (error: any) {
    console.error('❌ Error in handleBkashSetupIPN:', error.message);
    console.error('Error Details:', JSON.stringify(error, null, 2));
    console.log('=== HANDLE BKASH SETUP IPN CONTROLLER END ===');
    res.status(500).json(ApiResponse.error(error.message, 500));
  }
}


export default { handleIPN, handleCardIPN, handlebdtIPN , handleShurjopayIPN, handleBkashSetupIPN };