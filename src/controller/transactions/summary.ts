import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import CustomError from "../../utils/custom_error.js";
import summaryService from "../../services/transactions/summary.js";

const getTransactionSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const merchantId = (req.user as JwtPayload)?.merchant_id || req.query?.merchantId;

    // Validate required parameters
    if (!startDate) {
      throw new CustomError("Start date is required", 400);
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
    if (!dateRegex.test(startDate as string)) {
      throw new CustomError("Invalid start date format. Expected format: YYYY-MM-DDTHH:mm:ss±HH:mm", 400);
    }

    if (endDate && !dateRegex.test(endDate as string)) {
      throw new CustomError("Invalid end date format. Expected format: YYYY-MM-DDTHH:mm:ss±HH:mm", 400);
    }

    // Get transaction summary
    const summary = await summaryService.getTransactionSummary({
      startDate: startDate as string,
      endDate: endDate as string,
      merchantId: merchantId ? parseInt(merchantId as string) : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Transaction summary retrieved successfully",
      data: summary,
    });
  } catch (error: any) {
    console.error("Error in getTransactionSummary:", error);
    
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

export default {
  getTransactionSummary,
};
