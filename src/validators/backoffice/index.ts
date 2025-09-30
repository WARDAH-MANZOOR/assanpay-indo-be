import { body, validationResult } from "express-validator";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";

const validateSettlement = [
    body('merchant_id')
        .isInt()
        .withMessage('Merchant ID must be an integer')
        .custom(async (value) => {
            const merchant = await prisma.merchant.findUnique({
                where: {
                    merchant_id: value
                }
            })
            if (!merchant) {
                throw new CustomError("Invalid Merchant Id", 500);
            }
        }),
    body('date').isString().withMessage('Date must be a valid date'),
    body('pkr_amount').isFloat({ min: 0 }).withMessage('PKR Amount must be a positive float'),
    body('usdt_amount').isFloat({ min: 0 }).withMessage('USDT Amount must be a positive float'),
    body('usdt_pkr_rate').isFloat({ min: 0 }).withMessage('USDT PKR Rate must be a positive float'),
    body('conversion_charges').isString().isLength({ min: 0 }).withMessage('Conversion Charges must be a string'),
    body('total_usdt').isFloat({ min: 0 }).withMessage('Total USDT must be a positive float'),
    body('wallet_address').isString().isLength({ min: 1 }).withMessage('Wallet Address must be a non-empty string'),
];

const handleValidationErrors = (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
export default {
    validateSettlement,
    handleValidationErrors
}