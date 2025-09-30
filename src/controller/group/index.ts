import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { groupService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";

const createGroupController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new CustomError(errors.array()[0]?.msg as unknown as string);
        }
        const {name, permissionIds} = req.body;
        const merchant_id = (req.user as JwtPayload)?.merchant_id;
        if (!merchant_id) {
            throw new CustomError("Not authorized",500);
        }
        const result = await groupService.createGroup(name, merchant_id, permissionIds)
        res.status(200).json(ApiResponse.success(result))
    } catch (error: any) {
        console.log(error)
        res.status(500).json(ApiResponse.error(error))
    }
};
// merchantId: number, groupId: number
const readGroupsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new CustomError(errors.array()[0]?.msg as unknown as string);
        } 
        const { group_id } = req.query;
        const merchant_id = (req.user as JwtPayload)?.merchant_id || req.query.merchant_id;
        const result = await groupService.readGroups(Number(merchant_id), Number(group_id) )
        res.status(200).json(ApiResponse.success(result));
    } catch (error: any) {
        next(error)
    }
};

const deleteGroupController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new CustomError(errors.array()[0]?.msg as unknown as string);
        }
        const { groupId } = req.params;
        const result = await groupService.deleteGroup(Number(groupId));
        res.status(200).json(ApiResponse.success(result));
    } catch (error: any) {
        next(error)
    }
};

const updateGroupPermissionsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new CustomError(errors.array()[0]?.msg as unknown as string);
        }
        const {groupId} = req.params;
        const { permissionIds, name } = req.body;
        const result = await groupService.updateGroupPermissions(Number(groupId), permissionIds, name);
        res.status(200).json(ApiResponse.success(result))
    } catch (error: any) {
        // res.status(500).json({ success: false, message: error.message });
        next(error)
    }
};

export default {
    createGroupController,
    deleteGroupController,
    readGroupsController,
    updateGroupPermissionsController,
}