import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { chargeback } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const createChargeback = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const merchantId = (req.user as JwtPayload)?.merchant_id || req.body.merchant_id;
        const result = await chargeback.createChargeBack(body, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const getChargebacks = async (req: Request, res: Response) => {
    try {
        const params = req.query;
        const merchantId = (req.user as JwtPayload)?.merchant_id || params.merchantId;
        const result = await chargeback.getChargebacks(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const exportChargebacks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchantId;
    const merchant = await chargeback.exportChargebacks(id, query);
    res.send(merchant);
  } catch (error) {
    next(error);
  }
}

export default {
    createChargeback,
    getChargebacks,
    exportChargebacks
}