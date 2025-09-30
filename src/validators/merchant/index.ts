import { body, param } from "express-validator";

const updateMerchantValidation = [
    body('username').optional().isString().withMessage('Username is required'),
    body('phone_number').optional().isString().withMessage('Phone number is required'),
    body('company_name').optional().isString().withMessage('Company name is required'),
    body('city').optional().isString().withMessage('City is required'),
    body('commission').optional().isNumeric().withMessage('Commission should be a number'),
    body('settlementDuration').optional().isNumeric().withMessage('Settlement duration should be a number'),
    // body('easypaisaMethod').optional().isString().withMessage('Easy Paisa Method is required').isIn(["DIRECT", "SWITCH"]).withMessage('Invalid Method'),
    // body('merchantId').isString().withMessage('Merchant ID is required'),
]; 
 
const addMerchantValidation = [
    body('username').isString().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().withMessage('Password is required'),
    // body('phone_number').isString().withMessage('Phone number is required'),
    // body('company_name').isString().withMessage('Company name is required'),
    // body('city').isString().withMessage('City is required'),
    body('payment_volume').isString().withMessage('Payment volume should be a string'),
    body('commission').isNumeric().withMessage('Commission should be a number'),
    body('settlementDuration').isNumeric().withMessage('Settlement duration is required'),
    body('encrypted').isString().withMessage('Encrypted is required').isIn(["True", "False"]).withMessage('Invalid Encrypted'),
    // body('easypaisaMethod').isString().withMessage("Easy Paisa Method is required").isIn(["DIRECT", "SWITCH"]).withMessage("Invalid Method")
];

export {
    updateMerchantValidation,
    addMerchantValidation
}