import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { JwtPayload } from "jsonwebtoken";
import { dashboardService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const merchantDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    const queryParameters = req.query;
    const user = req.user as JwtPayload;
    const result = await dashboardService.merchantDashboardDetails(
      queryParameters,
      user
    );
    res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
  }
};

const merchantDashboardDetailsClone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    const queryParameters = req.query;
    const user = req.user as JwtPayload;
    const merchantId = req.params.merchantId as string;
    const result = await dashboardService.merchantDashboardDetailsClone(
      {...queryParameters, merchantId},
      user
    );
    res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
  }
};

const adminDashboardDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.status(400).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    const queryParameters = req.query;
    const result = await dashboardService.adminDashboardDetails(
      queryParameters
    );
    res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(400).json(ApiResponse.error(error?.message, error?.statusCode));
  }
};

export default { merchantDashboardDetails, adminDashboardDetails, merchantDashboardDetailsClone };
