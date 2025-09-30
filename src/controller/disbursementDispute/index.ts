import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse.js";
import { disbursementDispute } from "../../services/index.js";

const createDisbursementDispute = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const merchantId = (req.user as JwtPayload)?.merchant_id || req.body.merchant_id;
        const result = await disbursementDispute.createDisbursementDispute(body, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const updateDisbursementDisputeStatus = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const { requestId } = req.params;
        const result = await disbursementDispute.updateDisbursementDispute(Number(requestId), body);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const getDisbursementDisputes = async (req: Request, res: Response) => {
    try {
        const params = req.query;
        const merchantId = (req.user as JwtPayload)?.merchant_id || params.merchantId;
        const result = await disbursementDispute.getDisbursementDisputes(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const exportDisbursementDisputes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req;
    const id = (req.user as JwtPayload)?.merchant_id || query.merchantId;
    const merchant = await disbursementDispute.exportDisbursementDispute(id, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(merchant);
  } catch (error) {
    next(error);
  }
}

export default {
    createDisbursementDispute,
    updateDisbursementDisputeStatus,
    getDisbursementDisputes,
    exportDisbursementDisputes
}