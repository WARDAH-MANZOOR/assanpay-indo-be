import { NextFunction, Request, Response } from "express";
import { teleService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const getAllWalletAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await teleService.getAllWalletAccounts();
        res.status(200).json(ApiResponse.success(result));
    }
    catch(err: any) {
        next(err);
    }
}

const getAllWalletAccountsWithMerchant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await teleService.getAllWalletAccountWithAMerchant();
        res.status(200).json(ApiResponse.success(result));
    }
    catch(err: any) {
        next(err);
    }
}

export default {
    getAllWalletAccounts,
    getAllWalletAccountsWithMerchant
}