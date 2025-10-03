// // src/controller/payin/launcx.ts
// import axios from "axios";
// import { Request, Response } from "express";
// import prisma from "../../lib/prisma.js";
// import { PROVIDERS } from "../../constants/providers.js";

// const launcxApi = axios.create({
//   baseURL:
//     process.env.NODE_ENV === "production"
//       ? "https://launcx.com/api/v1"
//       : "https://staging.launcx.com/api/v1",
//   headers: {
//     "Content-Type": "application/json",
//     "x-api-key": process.env.LAUNCX_API_KEY!,
//   },
// });

// launcxApi.interceptors.request.use((cfg) => {
//   cfg.headers["x-timestamp"] = Date.now().toString();
//   return cfg;
// });

// // export const LauncxPayment = async (req: Request, res: Response) => {
// //   try {
// //     const { merchantId } = req.params;
// //     const { price, playerId, flow = "redirect" } = req.body;

// //     const merchant = await prisma.merchant.findFirst({
// //       where: { uid: merchantId },
// //     });

// //     if (!merchant) return res.status(400).json({ error: "Merchant Not Found" });

// //     const priceNum = Number(price);
// //     if (!price || isNaN(priceNum) || priceNum <= 0) {
// //       return res.status(400).json({ error: "`price` must be a number greater than 0" });
// //     }

// //     const payload = {
// //       price: priceNum,
// //       playerId: playerId || `merchant_${merchantId}`,
// //       flow,
// //     };

// //     const response = await launcxApi.post("/payments", payload, {
// //       validateStatus: () => true,
// //     });

// //     // Staging uses response.data.data, Production uses response.data.result
// //     const orderId = response.data?.data?.orderId || response.data?.result?.orderId;
// //     if (!orderId) {
// //       console.error("❌ Launcx returned invalid response:", response.data);
// //       return res
// //         .status(502)
// //         .json({ error: "Launcx API unavailable or returned invalid response" });
// //     }

// //     // Create transaction in DB
// //     await prisma.transaction.create({
// //       data: {
// //         merchant_transaction_id: orderId,
// //         transaction_id: orderId,
// //         date_time: new Date(),
// //         original_amount: priceNum,
// //         type: "wallet",
// //         status: "pending",
// //         merchant_id: merchant.merchant_id,
// //         settled_amount: 0,
// //         balance: 0,
// //         providerDetails: {
// //           name: PROVIDERS.LAUNCX,
// //           sub_name: PROVIDERS.QRIS,
// //           transactionId: orderId,
// //         },
// //         response_message: null,
// //       },
// //     });

// //     // Redirect flow handling
// //     if (flow === "redirect" && response.status === 303) {
// //       return res.status(200).json({ status: "success", url: response.headers.location });
// //     }

// //     // Return full response
// //     return res.status(200).json({ status: "success", data: response.data });
// //   } catch (err: any) {
// //     console.error("❌ Launcx Error:", err.response?.data || err.message);
// //     return res.status(500).json({ error: err.message || "Transaction not Created" });
// //   }
// // };
// export const LauncxPayment = async (req: Request, res: Response) => {
//   try {
//     const { merchantId } = req.params;
//     const { price, playerId, flow = "redirect" } = req.body;

//     const merchant = await prisma.merchant.findFirst({
//       where: { uid: merchantId },
//     });

//     if (!merchant) {
//       return res.status(400).json({ error: "Merchant Not Found" });
//     }

//     const priceNum = Number(price);
//     if (!price || isNaN(priceNum) || priceNum <= 0) {
//       return res
//         .status(400)
//         .json({ error: "`price` must be a number greater than 0" });
//     }

//     const payload = {
//       price: priceNum,
//       playerId: playerId || `merchant_${merchantId}`,
//       flow,
//     };

//     const response = await launcxApi.post("/payments", payload, {
//       validateStatus: () => true, // allow 303 status
//     });

//     // 🎯 Handle Redirect Flow
//     if (flow === "redirect" && response.status === 303 && response.headers.location) {
//       // Save transaction in DB
//       await prisma.transaction.create({
//         data: {
//           merchant_transaction_id: response.headers.location, // ya orderId if needed
//           transaction_id: response.headers.location,
//           date_time: new Date(),
//           original_amount: priceNum,
//           type: "wallet",
//           status: "pending",
//           merchant_id: merchant.merchant_id,
//           settled_amount: 0,
//           balance: 0,
//           providerDetails: {
//             name: PROVIDERS.LAUNCX,
//             sub_name: PROVIDERS.QRIS,
//             transactionId: response.headers.location,
//           },
//           response_message: null,
//         },
//       });

//       return res.status(200).json({
//         status: "success",
//         redirectUrl: response.headers.location, // 👈 frontend ko ye url use karna hai
//       });
//     }

//     // 🎯 Handle Embed Flow / Normal JSON
//     const orderId = response.data?.data?.orderId || response.data?.result?.orderId;
//     if (!orderId) {
//       console.error("❌ Launcx returned invalid response:", response.data);
//       return res
//         .status(502)
//         .json({ error: "Launcx API unavailable or returned invalid response" });
//     }

//     // Save transaction in DB
//     await prisma.transaction.create({
//       data: {
//         merchant_transaction_id: orderId,
//         transaction_id: orderId,
//         date_time: new Date(),
//         original_amount: priceNum,
//         type: "wallet",
//         status: "pending",
//         merchant_id: merchant.merchant_id,
//         settled_amount: 0,
//         balance: 0,
//         providerDetails: {
//           name: PROVIDERS.LAUNCX,
//           sub_name: PROVIDERS.QRIS,
//           transactionId: orderId,
//         },
//         response_message: null,
//       },
//     });

//     return res.status(200).json({ status: "success", data: response.data });
//   } catch (err: any) {
//     console.error("❌ Launcx Error:", err.response?.data || err.message);
//     return res.status(500).json({
//       error: err.message || "Transaction not Created",
//     });
//   }
// };

// export default { LauncxPayment };

// src/controller/payin/launcx.ts
import axios from "axios";
import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { PROVIDERS } from "../../constants/providers.js";

const launcxApi = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://launcx.com/api/v1"
      : "https://staging.launcx.com/api/v1",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.LAUNCX_API_KEY!,
  },
});

// Add timestamp interceptor
launcxApi.interceptors.request.use((cfg) => {
  cfg.headers["x-timestamp"] = Date.now().toString();
  return cfg;
});

export const LauncxPayment = async (req: Request, res: Response) => {
  try {
    const { merchantId } = req.params;
    const { price, playerId, flow = "redirect" } = req.body;

    // ✅ Check merchant
    const merchant = await prisma.merchant.findFirst({
      where: { uid: merchantId },
    });

    if (!merchant) {
      return res.status(400).json({ error: "Merchant Not Found" });
    }

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      return res
        .status(400)
        .json({ error: "`price` must be a number greater than 0" });
    }

    const payload = {
      price: priceNum,
      playerId: playerId || `merchant_${merchantId}`,
      flow,
    };

    // ✅ Call Launcx
    const response = await launcxApi.post("/payments", payload, {
      maxRedirects: 0, // 👈 prevent axios from following redirects
      validateStatus: (status) => status === 303 || status < 400,
    });

    // 🎯 Redirect flow
    if (flow === "redirect") {
      const redirectUrl = response.headers.location;
      if (!redirectUrl) {
        console.error("❌ No redirect URL from Launcx", response.data);
        return res
          .status(502)
          .json({ error: "Redirect URL not found from Launcx" });
      }
      const orderId = new URL(redirectUrl).pathname.split("/").pop();

      // Save transaction
      await prisma.transaction.create({
        data: {
          merchant_transaction_id: orderId, // you may replace with Launcx orderId later
          transaction_id: orderId,
          date_time: new Date(),
          original_amount: priceNum,
          type: "wallet",
          status: "pending",
          merchant_id: merchant.merchant_id,
          settled_amount: 0,
          balance: 0,
          providerDetails: {
            name: PROVIDERS.LAUNCX,
            sub_name: PROVIDERS.QRIS,
            transactionId: redirectUrl,
          },
          response_message: null,
        },
      });

      return res.json({
        status: "success",
        redirectUrl,
      });
    }

    // 🎯 Embed flow (JSON response)
    const orderId =
      response.data?.data?.orderId || response.data?.result?.orderId;

    if (!orderId) {
      console.error("❌ Invalid Launcx embed response:", response.data);
      return res
        .status(502)
        .json({ error: "Launcx API unavailable or returned invalid response" });
    }

    // Save transaction
    await prisma.transaction.create({
      data: {
        merchant_transaction_id: orderId,
        transaction_id: orderId,
        date_time: new Date(),
        original_amount: priceNum,
        type: "wallet",
        status: "pending",
        merchant_id: merchant.merchant_id,
        settled_amount: 0,
        balance: 0,
        providerDetails: {
          name: PROVIDERS.LAUNCX,
          sub_name: PROVIDERS.QRIS,
          transactionId: orderId,
        },
        response_message: null,
      },
    });

    return res.json({ status: "success", data: response.data });
  } catch (err: any) {
    console.error("❌ Launcx Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: err.message || "Transaction not Created",
    });
  }
};

export default { LauncxPayment };
