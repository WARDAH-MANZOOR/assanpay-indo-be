import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import { transactionService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";

const filterTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryParameters = req.query;
    const user = req.user;
    const result = await transactionService.filterTransactions(queryParameters, user);
     res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
}

const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryParameters = req.query;
    const result = await transactionService.getDashboardSummary(queryParameters);
     res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
}

const getCustomerTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = (req.user as JwtPayload)?.id;
    const transactions = await transactionService.getCustomerTransactions({ id });
    res.status(200).json(ApiResponse.success(transactions));
  }
  catch (err) {
    res.status(500).json(ApiResponse.error("Internal Server Error"))
  }
}

export default { filterTransactions, getDashboardSummary, getCustomerTransactions };