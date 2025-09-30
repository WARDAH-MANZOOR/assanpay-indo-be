import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse.js";
import disbursementRequestService from "../../services/disbursementRequest/index.js";

const createDisbursementRequest = async (req: Request, res: Response) => {
    try {
        const { requested_amount } = req.body;
        const merchantId = (req.user as JwtPayload)?.merchant_id || req.body.merchant_id;
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
            return;
        }
        const result = await disbursementRequestService.createDisbursementRequest(requested_amount, merchantId);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const updateDisbursementRequestStatus = async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const { requestId } = req.params;
        const validationErrors = validationResult(req);
        if (!validationErrors.isEmpty()) {
            res.status(400).json(ApiResponse.error(validationErrors.array()[0] as unknown as string));
            return;
        }
        const result = await disbursementRequestService.updateDisbursementRequestStatus(Number(requestId), status);
        res.status(200).json(ApiResponse.success(result));
    }
    catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const getDisbursementRequests = async (req: Request, res: Response) => {
    try {
        const params = req.query;
        const user = req.user as JwtPayload;
        let merchantId: string | undefined = undefined;
        if (user.role === 'Merchant') {
            // Always restrict to merchant's own ID
            merchantId = user.merchant_id;
        } else if (user.role === 'Admin') {
            // Admin may pass optional merchantId from query
            if (params.merchantId) {
                merchantId = params.merchantId as string;
            }
        }
        const result = await disbursementRequestService.getDisbursementRequests(params, merchantId);
        res.status(200).json(ApiResponse.success(result));
    } catch (err: any) {
        res.status(500).json(ApiResponse.error(err.message));
    }
}

const exportDisbursementRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { query } = req;
        const id = (req.user as JwtPayload)?.merchant_id || query.merchant_id;
        const merchant = await disbursementRequestService.exportDisbursementRequest(id, query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(merchant);
    } catch (error) {
        next(error);
    }
}

export default {
    createDisbursementRequest,
    updateDisbursementRequestStatus,
    getDisbursementRequests,
    exportDisbursementRequest
}