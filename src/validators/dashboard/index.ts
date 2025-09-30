import { query } from "express-validator";

const merchantDashboardValidation = [
    query('merchantId').optional().isString().withMessage('Merchant ID is required'),
    query('start').optional().isString().withMessage('Start date should be a valid date string'),
    query('end').optional().isString().withMessage('End date should be a valid date string'),
];

const adminDashboardValidation = [
    query('start').optional().isString().withMessage('Start date should be a valid date string'),
    query('end').optional().isString().withMessage('End date should be a valid date string'),
];

export {
    merchantDashboardValidation,
    adminDashboardValidation
}