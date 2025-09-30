import { NextFunction, Request, RequestHandler, Response } from "express";
import prisma from "../lib/prisma.js";
import { transactionService } from "services/index.js";
import ApiResponse from "./ApiResponse.js";

const blockPhoneNumber: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let findMerchant = await prisma.merchant.findFirst({
            where: {
                uid: req.params.merchantId as string
            },
            include: {
                commissions: true
            }
        })

        if (!findMerchant) {
            res.status(500).send("Merchant Not Found");
            return;
        }

        const data = await prisma.blockedPhoneNumbers.findUnique({
            where: {
                phoneNumber: req.body.phone || req.body.accountNo
            }
        });

        if (data) {
            let id = transactionService.createTransactionId();
            let id2 = req.body.order_id || id;
            await transactionService.createTxn({
                order_id: id2,
                transaction_id: id,
                amount: req.body.amount,
                status: "failed",
                type: req.body.type,
                merchant_id: findMerchant.merchant_id,
                commission: 0,
                settlementDuration: findMerchant.commissions[0].settlementDuration,
                providerDetails: {
                    msisdn: req.body.phone
                },
                response_message: "Number Blocked"
            })
            res.status(500).send(ApiResponse.error("Number is Blocked for Fraud Transaction", 500));
            return;
        }

        // Proceed to the next middleware
        return next();
    } catch (error) {
        res.status(401).json(ApiResponse.error("Number is Blocked for Fraud Transaction", 401));
    }
};

const blockPhoneNumberInRedirection: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const paymentRequest = await prisma.paymentRequest.findFirst({
            where: {
                id: req.body.payId,
                deletedAt: null,
            },
        });

        if (!paymentRequest) {
            res.status(500).send(ApiResponse.error("Payment request not found"));
            return;
        }

        if (!paymentRequest.userId) {
            res.status(500).send(ApiResponse.error("User not found"));
            return;
        }

        // find merchant by user id because merchant and user are the same
        const merchant = await prisma.merchant.findFirst({
            where: {
                merchant_id: paymentRequest.userId,
            },
            include: {
                commissions: true
            }
        });

        if (!merchant || !merchant.uid) {
            res.status(500).send(ApiResponse.error("Merchant not found"));
            return;
        }

        const data = await prisma.blockedPhoneNumbers.findUnique({
            where: {
                phoneNumber: req.body.accountNo
            }
        });

        if (data) {
            let id = transactionService.createTransactionId();
            let id2 = req.body.order_id || id;
            res.status(500).send(ApiResponse.error("Number is Blocked for Fraud Transaction", 500));
            return;
        }

        // Proceed to the next middleware
        return next();
    } catch (error) {
        res.status(401).json(ApiResponse.error("Number is Blocked for Fraud Transaction", 401));
    }
};

export default { blockPhoneNumber, blockPhoneNumberInRedirection }