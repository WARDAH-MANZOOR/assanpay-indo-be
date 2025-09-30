import { body, validationResult } from "express-validator";
import CustomError from "../../utils/custom_error.js";

const validateChargeBack = [
    body('order_id')
        .isString()
        .withMessage('Order Id must be a valid string')
        .custom(async (value) => {
            const transaction = await prisma?.transaction.findUnique({
                where: {
                    merchant_transaction_id: value
                }
            })
            if (!transaction) {
                throw new CustomError("Invalid Merchant Id", 500);
            }
        }),
    body('reason').isString().withMessage('PKR Amount must be a string'),
];

const handleValidationErrors = (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export default {
    validateChargeBack,
    handleValidationErrors
}