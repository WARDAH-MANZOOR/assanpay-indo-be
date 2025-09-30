import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { topup } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const createTopup = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const merchantId = (req.user as JwtPayload)?.merchant_id || req.body.merchant_id;
        const result = await topup.createTopup(body, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const getTopups = async (req: Request, res: Response) => {
    try {
        const params = req.query;
        const merchantId = (req.user as JwtPayload)?.merchant_id || params.merchantId;
        const result = await topup.getTopups(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const exportTopups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchantId;
    const merchant = await topup.exportTopup(id, query);
    res.send(merchant);
  } catch (error) {
    next(error);
  }
}

export default {
    createTopup,
    getTopups,
    exportTopups
}