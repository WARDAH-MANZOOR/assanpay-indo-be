import { NextFunction, Request, Response } from "express";
import { authenticationService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const passwordHash = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {password} = req.body;
        const hash = await authenticationService.hashPassword(password);
        res.status(200).json(ApiResponse.success(hash));
    }
    catch(err) {
        next(err);
    }
}

export default {passwordHash}