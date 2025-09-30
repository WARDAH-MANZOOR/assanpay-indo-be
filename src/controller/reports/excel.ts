import { get_pending_settlements } from "@prisma/client/sql";
import { NextFunction, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { reportService } from "../../services/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
const generateExcelReportController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Call the service method
        const params = req.query;
        const reportPath = await reportService.generateExcelReportService(params);

        // Send the generated Excel file to the client
        res.download(reportPath, "merchant_report.xlsx", (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: "Error downloading the file." });
            }
        });
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to the global error handler
    }
};

const payinPerWalletController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Call the service method
        const params = req.query;
        const result = await reportService.payinPerWalletService(params);

        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to the global error handler
    }
};

const payoutPerWalletController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Call the service method
        const params = req.query;
        const result = await reportService.payoutPerWalletService(params);

        return res.status(200).json(ApiResponse.success(result));
    } catch (error) {
        console.error(error);
        next(error); // Pass the error to the global error handler
    }
};

const getPendingSettlements = async (req: Request, res: Response, next: NextFunction) => {
    // Call the service method
    const params = req.query;
    // const result = await reportService.payinPerWalletService(params);
    const now = new Date();

    // Convert current UTC time to PKT (UTC+5)
    const pktOffset = 5 * 60 * 60 * 1000; // PKT is UTC+5
    const pktNow = new Date(now.getTime() + pktOffset);

    // Get today's date in PKT
    const today = pktNow.toISOString().split('T')[0];

    // Get yesterday's date in PKT 
    pktNow.setDate(pktNow.getDate() - 1); 
    const yesterday = pktNow.toISOString().split('T')[0];

    
    const result = await prisma.$queryRawTyped(get_pending_settlements(new Date(yesterday), new Date(today)))
    
    const formattedResults = result.map(row => ({
        ...row,
        scheduled_task_count: row.scheduled_task_count ? row.scheduled_task_count.toString() : "0",
        total_transaction_amount: row.total_transaction_amount ? row.total_transaction_amount.toString() : "0"
      }));

    return res.status(200).json(ApiResponse.success(formattedResults));
}

export default {generateExcelReportController, payinPerWalletController, getPendingSettlements, payoutPerWalletController}