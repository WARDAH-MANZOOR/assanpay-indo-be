import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { exportSettlement, getSettlement } from "../../services/settlement/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const getSettlements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParameters = req.query;
        const user = req.user as JwtPayload;
        const result = await getSettlement(
            queryParameters,
            user
        );
        res.status(200).json(ApiResponse.success(result));
    } catch (error: any) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
}

const exportSettlements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const queryParameters = req.query;
        const user = req.user as JwtPayload;
        const result = await exportSettlement(
            queryParameters,
            user
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.send(result);
    } catch (error: any) {
        res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
    }
}

export { getSettlements, exportSettlements };