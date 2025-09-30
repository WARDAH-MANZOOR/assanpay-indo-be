import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { merchantService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import CustomError from "../../utils/custom_error.js";
import { JwtPayload } from "jsonwebtoken";

const updateMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(404).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return;
    }
    const payload = req.body;
    const result = await merchantService.updateMerchant(payload);
    res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(error.statusCode).send(ApiResponse.error(error.message))
  }
};

const getMerchants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryParameters = req.query;
    const result = await merchantService.getMerchants(queryParameters);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const addMerchant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(404).json(ApiResponse.error(errors.array()[0] as unknown as string))
      return
    }
    const payload = req.body;
    const result = await merchantService.addMerchant(payload);
    if (result == "Settlment Duration Required") {
      throw new CustomError(result, 400)
    }
    res.status(200).json(ApiResponse.success(result));
  } catch (error: any) {
    res.status(error.statusCode).send(ApiResponse.error(error.message));
  }
};

const setDisbursePercent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchant_id = (req.user as JwtPayload)?.merchant_id || req.body.merchant_id;
    const percent = req.body.percent;
    const result = await merchantService.setDisbursePercent(merchant_id, percent);
    res.status(200).json(ApiResponse.success(result));
  }
  catch (err) {
    next(err)
  }
}
export default { updateMerchant, getMerchants, addMerchant, setDisbursePercent };