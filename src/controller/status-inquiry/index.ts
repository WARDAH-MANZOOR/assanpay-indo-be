import axios from "axios";
import { Request, Response } from "express";
import { generateStarPagoSignature } from "../../utils/starPagoSignature.js";

export const starPagoPayIntStatusInquiry = async (req: Request, res: Response) => {
  try {
    const { merOrderNo, orderNo } = req.query;

    const params = {
      appId: process.env.STARPAGO_APP_ID!,
      merOrderNo: (merOrderNo as string) || "",
      orderNo: (orderNo as string) || "",
    };

    const sign = generateStarPagoSignature(params, process.env.STARPAGO_SECRET!);

    const url = `${process.env.STARPAGO_BASE_URL}/api/v2/payment/order/query`;
    console.log("🌐 StarPago Query URL:", url);
    console.log("📦 Params:", { ...params, sign });

    const response = await axios.get(url, { params: { ...params, sign } });

    console.log("✅ StarPago Payin Query Response:", response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error("❌ Payin Query Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to query payin order",
      details: error.response?.data || error.message,
    });
  }
};


// ✅ Payout Order Query
export const starPagoPayOutStatusInquiry = async (req: Request, res: Response) => {
  try {
    const { merOrderNo, orderNo } = req.query;

    const params = {
      appId: process.env.STARPAGO_APP_ID!,
      merOrderNo: (merOrderNo as string) || "",
      orderNo: (orderNo as string) || "",
    };

    const sign = generateStarPagoSignature(params, process.env.STARPAGO_SECRET!);

    const response = await axios.get(`${process.env.STARPAGO_BASE_URL}/api/v2/payout/order/query`, {
      params: { ...params, sign },
    });

    console.log("✅ StarPago Payout Query Response:", response.data);
    res.json(response.data);
  } catch (error: any) {
    console.error("❌ Payout Query Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to query payout order",
      details: error.response?.data || error.message,
    });
  }
};


// ✅ Balance Query
export const queryStarPagoBalance = async (req: Request, res: Response) => {
  try {
    const params = {
      appId: process.env.STARPAGO_APP_ID!,
    };

    const sign = generateStarPagoSignature(params, process.env.STARPAGO_SECRET!);
    const url = `${process.env.STARPAGO_BASE_URL}/api/v2/merchant/balance`;

    console.log("🌐 StarPago Balance Query URL:", url);
    console.log("📦 Params:", { ...params, sign });

    const response = await axios.get(url, { params: { ...params, sign } });

    // Send response to client
    res.json(response.data);
  } catch (error: any) {
    console.error("❌ Balance Query Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to query balance",
      details: error.response?.data || error.message,
    });
  }
};

// ✅ Export both named functions
export default {
  starPagoPayIntStatusInquiry,
  starPagoPayOutStatusInquiry,
  queryStarPagoBalance
};
