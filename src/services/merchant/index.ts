import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import type { Merchant } from "../../types/merchant.js";
import { hashPassword } from "../../services/authentication/index.js";


const updateMerchant = async (payload: Merchant) => {
  const {
    username,
    phone_number,
    company_name,
    company_url,
    city,
    payment_volume,
    commission,
    merchantId,
    commissionGST,
    commissionWithHoldingTax,
    disbursementGST,
    disbursementRate,
    disbursementWithHoldingTax,
    settlementDuration,
    payinxMerchantId,
    webhook_url,
    depositMethod,
    withdrawalMethod,
    encrypted,
    callback_mode,
    payout_callback,
    easypaisaLimit,
    swichLimit,
    commissionMode,
    easypaisaRate,
    wooMerchantId,
    cardRate,
    depositInquiryMethod,
    withdrawalInquiryMethod
  } = payload;
  try {
    // let enc = stringToBoolean(encrypted);
    let result = await prisma.$transaction(async (tx) => {
      let method = depositMethod?.toUpperCase();
      if (method != "STARPAGO") {
        throw new CustomError("Easy Paisa Method not valid", 400);
      }
      let payoutCallbackUrl = callback_mode === "SINGLE" ? null : payout_callback;
      let easypaisa_rate = commissionMode === "SINGLE" ? null : easypaisaRate;
      const user = await tx.merchant.update({
        data: {
          full_name: username,
          phone_number,
          company_name,
          company_url,
          city,
          payment_volume,
          payinxMerchantId,
          webhook_url,
          encrypted,
          callback_mode,
          payout_callback: payoutCallbackUrl,
          easypaisaLimit,
          swichLimit,
          wooMerchantId,
          depositMethod,
          withdrawalMethod,
          depositInquiryMethod,
          withdrawalInquiryMethod
        },
        where: { merchant_id: +merchantId },
      });
      let finance = await tx.merchantFinancialTerms.findUnique({
        where: { merchant_id: +merchantId },
      });
      await tx.merchantFinancialTerms.update({
        data: {
          commissionRate: commission,
          commissionGST: commissionGST,
          commissionWithHoldingTax: commissionWithHoldingTax,
          disbursementGST: disbursementGST,
          disbursementRate: disbursementRate,
          disbursementWithHoldingTax: disbursementWithHoldingTax,
          settlementDuration:
            settlementDuration != undefined
              ? +settlementDuration
              : finance?.settlementDuration,
          commissionMode,
          easypaisaRate: easypaisa_rate,
          cardRate: +cardRate
        },
        where: { merchant_id: +merchantId },
      });
      return "Merchant updated successfully";
    });
    return result;
  } catch (error: any) {
    console.log(error);
    throw new CustomError(
      error.error || "Internal Server Error",
      error.statusCode || 500
    );
  }
};

const getMerchants = async (params: any) => {
  try {
    const where: any = {};

    if (params?.uid) {
      where["uid"] = params.uid;
    }

    let merchants = await prisma.merchant.findMany({
      where,
      include: {
        commissions: true,
      },
    });
    return merchants;
  } catch (err: any) {
    throw new CustomError(err?.error, err?.statusCode);
  }
};

const findOne = async (params: any) => {
  try {
    const where: any = {};

    if (params?.uid) {
      where["uid"] = params.uid;
    }

    let merchants = await prisma.merchant.findFirst({
      where,
      include: {
        commissions: true,
      },
    });
    return merchants;
  } catch (err: any) {
    throw new CustomError(err?.error, err?.statusCode);
  }
};

const addMerchant = async (payload: Merchant) => {
  let {
    username,
    email,
    password,
    phone_number,
    company_name,
    company_url,
    city,
    payment_volume,
    commission,
    commissionGST,
    commissionWithHoldingTax,
    disbursementGST,
    disbursementRate,
    disbursementWithHoldingTax,
    settlementDuration,
    payinxMerchantId,
    webhook_url,
    depositMethod,
    withdrawalMethod,
    encrypted,
    callback_mode,
    payout_callback,
    easypaisaLimit,
    swichLimit,
    commissionMode,
    easypaisaRate,
    wooMerchantId,
    cardRate,
    depositInquiryMethod,
    withdrawalInquiryMethod
  } = payload;

  if (settlementDuration == undefined) {
    settlementDuration = 0;
  }

  try {
    const hashedPassword = await hashPassword(password as string);

    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: email as string,
          password: hashedPassword,
          username,
        },
      });
      let payoutCallbackUrl = callback_mode === "SINGLE" ? null : payout_callback;
      let easypaisa_rate = commissionMode === "SINGLE" ? null : easypaisaRate;
      // Create Merchant
      const merchant = await tx.merchant.create({
        data: {
          merchant_id: user.id,
          user_id: user.id,
          full_name: username,
          phone_number,
          company_name,
          company_url,
          city,
          payment_volume,
          payinxMerchantId,
          webhook_url,
          depositMethod,
          withdrawalMethod,
          encrypted,
          callback_mode,
          payout_callback: payoutCallbackUrl,
          easypaisaLimit,
          swichLimit,
          wooMerchantId,
          depositInquiryMethod,
          withdrawalInquiryMethod
        },
      });

      // Create Merchant Financial Terms
      await tx.merchantFinancialTerms.create({
        data: {
          commissionRate: commission,
          commissionGST: commissionGST ?? 0,
          commissionWithHoldingTax: commissionWithHoldingTax ?? 0,
          disbursementGST: disbursementGST ?? 0,
          disbursementRate: disbursementRate ?? 0,
          disbursementWithHoldingTax: disbursementWithHoldingTax ?? 0,
          settlementDuration: +settlementDuration,
          merchant_id: user.id,
          commissionMode,
          easypaisaRate: easypaisa_rate,
          cardRate: +cardRate
        },
      });

      // Create UserGroup
      await tx.userGroup.create({
        data: {
          userId: user.id,
          groupId: 2, // Adjust group ID as necessary
          merchantId: user.id,
        },
      });

      return "Merchant created successfully";
    });

    return result;
  } catch (error: any) {
    console.error("Error adding merchant:", error);
    throw new CustomError(
      error.message || "Internal Server Error",
      error.statusCode || 500
    );
  }
};

const setDisbursePercent = async (merchant_id: number, percent: number) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: {
        merchant_id: merchant_id
      }
    })

    if (!merchant) {
      throw new CustomError("Merchant Not Found", 404);
    }

    if (!percent || percent < 0) {
      throw new CustomError("Percent value not valid", 400);
    }

    let result = await prisma.merchant.update({
      where: {
        merchant_id,
      },
      data: {
        disburseBalancePercent: (+percent) / 100
      }
    })

    return result;
  }
  catch (err: any) {
    throw new CustomError(err?.message, err?.statusCode)
  }
}

export default { updateMerchant, getMerchants, addMerchant, findOne, setDisbursePercent };
