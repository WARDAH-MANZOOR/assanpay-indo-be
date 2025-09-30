import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { usdtSettlementService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const getUsdtSettlements = async (req: Request, res: Response) => {
    try {
        const params = req.query;
        const merchantId = (req.user as JwtPayload)?.merchant_id || params.merchantId;
        const result = await usdtSettlementService.getUsdtSettlements(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const exportUsdtSettlements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req;
      const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
      const merchant = await usdtSettlementService.exportUsdtSettlements(id, query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(merchant);
    } catch (error) {
      next(error);
    }
  }

export default {
    getUsdtSettlements,
    exportUsdtSettlements
}