import axios from "axios";
import { Request, Response } from "express";
import FormDataDefault from "form-data";
import {  createTxn } from "./index.js";
import prisma from "../../lib/prisma.js";
import { format } from "date-fns";

const FormData = FormDataDefault as unknown as {
  new (): {
    append(name: string, value: any): void;
    getHeaders(): Record<string, string>;
  };
};

export const createShurjopayTransactionId = () => {
  const currentTime = Date.now();
  const txnDateTime = format(new Date(), "yyyyMMddHHmmss");
  const fractionalMilliseconds = Math.floor(
    (currentTime - Math.floor(currentTime)) * 1000
  );

  const txnRefNo = `SP${txnDateTime}${fractionalMilliseconds.toString()}${Math.random().toString(36).substr(2, 4)}`;
  return txnRefNo;
}

export const ShurjoPayPayment = async (req: Request,res: Response): Promise<void> => {
  try {
    console.log('=== SHURJOPAY PAYMENT CONTROLLER START ===');
    console.log('Request Payload:', JSON.stringify(req.body, null, 2));
    console.log('Request Params:', JSON.stringify(req.params, null, 2));
    
    const { merchantId } = req.params;
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
      include: {
        commissions: true,
      },
    });
    let { amount, order_id, phone, redirect_url, payment_method } = req.body;

    if (!amount || !payment_method) {
      console.log('❌ Missing required fields:', { amount, payment_method });
      res
        .status(400)
        .json({ error: "amount and payment_method are required" });
      return;
    }

    if (!["bkash", "nagad"].includes(payment_method)) {
      console.log('❌ Invalid payment method:', payment_method);
      res.status(400).json({ error: "payment_method must be bkash or nagad" });
      return;
    }
    //
    // 1) LOGIN & GET TOKEN
    //
    let id = createShurjopayTransactionId();

    const loginPayload = {
      username: process.env.SJ_USERNAME,
      password: process.env.SJ_PASSWORD,
    };

    console.log('🔑 ShurjoPay Login Payload:', JSON.stringify(loginPayload, null, 2));

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

    const { token, token_type, execute_url, store_id } = loginResp.data as {
      token: string;
      token_type: string;
      execute_url: string;
      store_id: number;
    };


    //
    // 2) BUILD SECRET-PAY FORM
    //    (replace hard-coded values with req.body or other sources as you like)
    //
    const form = new FormData();
    form.append("prefix", "sp");
    form.append("token", token);
    form.append("return_url", redirect_url || "https://merchant.sahulatpay.com/redirect");
    form.append("cancel_url", "https://merchant.sahulatpay.com/failed");
    form.append("store_id", String(store_id));
    form.append("amount", amount || "0");
    form.append("order_id", order_id || id);
    form.append("currency", "BDT");
    form.append("customer_name", "Not Assigned");
    form.append("customer_address", "Not Assigned");
    form.append("customer_phone", phone );
    form.append("customer_city",  "Not Assigned");
    form.append("customer_post_code", "Not Assigned");
    form.append("client_ip",  "Not Assigned");
    form.append("payment_type",  "direct_payment");
    form.append("channel",  payment_method);

    console.log('📤 ShurjoPay Payment Form Data:', {
      prefix: "sp",
      token: token,
      return_url: redirect_url || "https://merchant.sahulatpay.com/redirect",
      cancel_url: "https://merchant.sahulatpay.com/failed",
      store_id: String(store_id),
      amount: amount || "0",
      order_id: order_id || id,
      currency: "BDT",
      customer_name: "Not Assigned",
      customer_address: "Not Assigned",
      customer_phone: phone,
      customer_city: "Not Assigned",
      customer_post_code: "Not Assigned",
      client_ip: "Not Assigned",
      payment_type: "direct_payment",
      channel: payment_method
    });

    //
    // 3) SUBMIT THE PAYMENT REQUEST
    //

    console.log('🚀 Submitting ShurjoPay Payment Request...');

    const payResp = await axios.post(execute_url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `${token_type} ${token}`,
      },
    });

    console.log("📥 ShurjoPay Payment Response:", JSON.stringify(payResp.data, null, 2));

    if (payResp.data.transactionStatus) {
      console.log('✅ ShurjoPay Payment Success');
      
      const result = {
        status: "success",
        data: {
          url: payResp.data.checkout_url,
          status: "Pending",
          reference: payResp.data.customer_order_id,
        },

        message: "Direct payment initiated successfully",
      };
  
      console.log('💾 Creating ShurjoPay Transaction...');
      
      await createTxn({
        order_id: order_id || id,
        transaction_id: id,
        amount: amount,
        status: "pending",
        type: "wallet",
        merchant_id: merchant?.merchant_id,
        commission: merchant?.commissions[0]?.commissionRate,
        settlementDuration: merchant?.commissions[0]?.settlementDuration,
        providerDetails: {
          id: 1,
          name: payment_method,
          msisdn: phone,
          sub_name: "ShurjoPay",
          transactionId: payResp.data.sp_order_id,
        },
      });
      
      console.log('💾 ShurjoPay Transaction Created Successfully');
      console.log('=== SHURJOPAY PAYMENT CONTROLLER END ===');
      
      res.status(200).json(result);
    } else {
      console.log('❌ ShurjoPay Payment Failed:', payResp.data);
      console.log('=== SHURJOPAY PAYMENT CONTROLLER END ===');
      res.status(500).json({ status: "error", message: "Direct payment initiation failed" , data: Array.isArray(payResp.data) ? {
        status: payResp.data[0]?.sp_code,
        message: payResp.data[0]?.message,
        errcode: "validation"
      } : [] });
    }
  } catch (err) {
    console.error("❌ Error in ShurjoPay flow:", err);
    console.error('Error Details:', JSON.stringify(err, null, 2));
    console.log('=== SHURJOPAY PAYMENT CONTROLLER END ===');
    if (axios.isAxiosError(err) && err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};
