import { Router } from 'express';
import { transactionController } from '../../controller/index.js';
import { authorize, isLoggedIn } from '../../utils/middleware.js';
import summaryController from '../../controller/transactions/summary.js';

const router = Router();

router.post('/', transactionController.filterTransactions);
router.get('/',[isLoggedIn], authorize("Transactions"), transactionController.getTransactions);
router.get('/tele', transactionController.getTeleTransactions);
router.get('/tele/last-15-mins', transactionController.getTeleTransactionsLast15Mins);
router.get('/tele/last-4-mins', transactionController.getTeleTransactionsLast4Mins);
router.get('/tele/last-15-3-mins', transactionController.getTeleTransactionsLast15MinsFromLast3Mins);
router.get('/summary', transactionController.getDashboardSummary);
router.get('/summary-report', [isLoggedIn], authorize("Transactions"), summaryController.getTransactionSummary);
router.get('/balance', transactionController.getProAndBal);
router.get("/customer", [isLoggedIn], transactionController.getCustomerTransactions);
router.get("/export",
    // [isLoggedIn], authorize("Transactions"), 
    transactionController.exportTransactions);
export default router;


/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Retrieve a list of transactions or perform a search based on various filters.
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Get a specific transaction by ID.
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions by a specific date.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date (for date range filtering).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions up to this date (for date range filtering).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, pending, failed]
 *         description: Filter transactions by status.
 *       - in: query
 *         name: groupByDay
 *         schema:
 *           type: boolean
 *         description: If true, group transactions by day (for daywise summaries).
 *     responses:
 *       200:
 *         description: List of transactions matching the search filters.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /transactions/summary-report:
 *   get:
 *     summary: Get transaction summary with categorization by transaction ID prefixes and providers
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering transactions (required). Format: YYYY-MM-DDTHH:mm:ss±HH:mm
 *         example: "2024-01-01T00:00:00+06:00"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering transactions (optional). If not provided, only startDate data will be returned. Format: YYYY-MM-DDTHH:mm:ss±HH:mm
 *         example: "2024-01-31T23:59:59+06:00"
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         description: Filter by specific merchant ID (optional)
 *         example: 123
 *     responses:
 *       200:
 *         description: Transaction summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Transaction summary retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/TransactionSummary'
 *       400:
 *         description: Bad request - Invalid date format or missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: string
 *           description: Unique transaction ID.
 *           example: "txn_1234567890"
 *         date_time:
 *           type: string
 *           format: date-time
 *           description: Transaction date and time.
 *           example: "2024-10-01T12:34:56Z"
 *         settled_amount:
 *           type: number
 *           description: The settled amount of the transaction.
 *           example: 150.75
 *         status:
 *           type: string
 *           description: Status of the transaction.
 *           enum: [completed, pending, failed]
 *           example: "completed"
 *         response_message:
 *           type: string
 *           description: Message associated with the transaction response.
 *           example: "Transaction successful"
 *     TransactionSummary:
 *       type: object
 *       properties:
 *         shamimTransactions:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Number of transactions starting with 'T'
 *               example: 150
 *             totalAmount:
 *               type: number
 *               description: Total amount for transactions starting with 'T'
 *               example: 15000.50
 *             bkashAmount:
 *               type: number
 *               description: Bkash provider amount within shamim transactions
 *               example: 8000.25
 *             nagadAmount:
 *               type: number
 *               description: Nagad provider amount within shamim transactions
 *               example: 7000.25
 *         bkashDirectTransactions:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Number of transactions starting with 'BK'
 *               example: 75
 *             totalAmount:
 *               type: number
 *               description: Total amount for transactions starting with 'BK'
 *               example: 7500.25
 *             bkashAmount:
 *               type: number
 *               description: Bkash provider amount within bkash direct transactions
 *               example: 5000.00
 *             nagadAmount:
 *               type: number
 *               description: Nagad provider amount within bkash direct transactions
 *               example: 2500.25
 *         shurjopayTransactions:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Number of transactions starting with 'SP'
 *               example: 30
 *             totalAmount:
 *               type: number
 *               description: Total amount for transactions starting with 'SP'
 *               example: 3000.75
 *             bkashAmount:
 *               type: number
 *               description: Bkash provider amount within shurjopay transactions
 *               example: 2000.50
 *             nagadAmount:
 *               type: number
 *               description: Nagad provider amount within shurjopay transactions
 *               example: 1000.25
 *         shahadatTransactions:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Number of transactions starting with 'DEV'
 *               example: 20
 *             totalAmount:
 *               type: number
 *               description: Total amount for transactions starting with 'DEV'
 *               example: 2000.00
 *             bkashAmount:
 *               type: number
 *               description: Bkash provider amount within shahadat transactions
 *               example: 1200.00
 *             nagadAmount:
 *               type: number
 *               description: Nagad provider amount within shahadat transactions
 *               example: 800.00
 *         grandTotal:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *               description: Total count of all successful transactions
 *               example: 275
 *             totalAmount:
 *               type: number
 *               description: Total amount of all successful transactions
 *               example: 27500.50
 *         dateRange:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               description: Start date of the query
 *               example: "2024-01-01T00:00:00+06:00"
 *             endDate:
 *               type: string
 *               description: End date of the query
 *               example: "2024-01-31T23:59:59+06:00"
 *     StatusSummary:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: Transaction status.
 *           enum: [completed, pending, failed]
 *           example: "completed"
 *         count:
 *           type: integer
 *           description: Number of transactions with this status.
 *           example: 50
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message.
 *           example: "Internal Server Error"
 *         statusCode:
 *           type: integer
 *           description: HTTP status code.
 *           example: 500
 */