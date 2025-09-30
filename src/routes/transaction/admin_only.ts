
/**
* @swagger
* components:
*  schemas:
*    Merchant:
*      type: object
*      properties:
*        merchant_id:
*          type: integer
*          example: 3
*        full_name:
*          type: string
*          example: "John Doe"
*        phone_number:
*          type: string
*          example: "+1234567890"
*        company_name:
*          type: string
*          example: "Example Company"
*        company_url:
*          type: string
*          nullable: true
*          example: null
*        city:
*          type: string
*          example: "New York"
*        payment_volume:
*          type: number
*          format: float
*          nullable: true
*          example: null
*        user_id:
*          type: integer
*          example: 3
*        commission:
*          type: string
*          example: "0.01"
*    Error:
*      type: object
*      properties:
*        message:
*          type: string
*          example: Internal Server Error 
*    MerchantProfitBalance:
*      type: object
*      properties:
*        merchant_id:
*          type: integer
*        profit:
*          type: number
*        balance:
*          type: number
*/

/**
 * @swagger
 * /admin_api/transactions:
 *   get:
 *     summary: Retrieve all transactions
 *     description: Retrieve all transactions, optionally filter by merchant or search by transaction ID.
 *     tags: [AdminOnly]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         description: Filter transactions by a specific merchant
 *         required: false
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Search by transaction ID
 *         required: false
 *       - in: query
 *         name: merchantName
 *         schema:
 *           type: string
 *         description: Search by merchant name
 *         required: false
 *     responses:
 *       200:
 *         description: A list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Internal Server Error
 */
// router.get("/transactions", isLoggedIn, isAdmin, getTransactions);

/**
 * @swagger
 * /admin_api/profit-balance/:
 *   get:
 *     summary: Retrieve balance and profit information for merchants
 *     description: Retrieve balance and profit for a specific merchant or all merchants. Optionally filter by date range.
 *     tags: [AdminOnly]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         description: Retrieve balance and profit for a specific merchant
 *         required: false
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter profits and balances from this date with this format YYYY-MM-DD)
 *         required: false
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter profits and balances up to this date with this format YYYY-MM-DD
 *         required: false
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [daily, weekly, custom]
 *         description: Filters transactions according to the given range
 *         required: true
 *     responses:
 *       200:
 *         description: A list of merchants with balance and profit details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MerchantProfitBalance'
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */

// router.get("/profit-balance", isLoggedIn, isAdmin, getProAndBal)

// /**
//  * @swagger
//  * /admin_api/search-transactions/:
//  *   get:
//  *     summary: Search transactions by transaction ID or merchant name
//  *     description: Retrieve transactions filtered by transaction ID and/or merchant name. Returns a list of matching transactions or an empty array if no matches are found.
//  *     tags:
//  *       - [AdminOnly]
//  *     parameters:
//  *       - in: query
//  *         name: transaction_id
//  *         schema:
//  *           type: string
//  *           description: The unique identifier of the transaction
//  *           example: "TX12345"
//  *       - in: query
//  *         name: merchant_name
//  *         schema:
//  *           type: string
//  *           description: The name of the merchant associated with the transaction
//  *           example: "John Doe"
//  *     responses:
//  *       200:
//  *         description: Successfully retrieved transactions matching the criteria
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   transaction_id:
//  *                     type: string
//  *                     description: Unique identifier of the transaction
//  *                     example: "TX12345"
//  *                   original_amount:
//  *                     type: number
//  *                     format: float
//  *                     description: The original amount of the transaction
//  *                     example: 100.00
//  *                   settled_amount:
//  *                     type: number
//  *                     format: float
//  *                     description: The settled amount of the transaction
//  *                     example: 95.00
//  *                   status:
//  *                     type: string
//  *                     description: Status of the transaction
//  *                     example: "completed"
//  *                   merchant_name:
//  *                     type: string
//  *                     description: Name of the merchant associated with the transaction
//  *                     example: "John Doe"
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 error:
//  *                   type: string
//  *                   description: Error message
//  *                   example: "Internal Server Error"
//  */

// router.get("/search-transactions", isLoggedIn, isAdmin, searchTransactions);

// /**
//  * @swagger
//  * /admin_api/profits-balances/:
//  *   get:
//  *     summary: Retrieve the balance and profit for all merchants within a specific date range
//  *     tags:
//  *       - [AdminOnly]
//  *     description: >
//  *       Fetches the total balance and calculated profit for all merchants over a specified time range, 
//  *       including daily, weekly, or custom date ranges. The profit is calculated as a percentage of the 
//  *       settled amount based on the merchant's commission rate.
//  *     parameters:
//  *       - in: query
//  *         name: range
//  *         required: true
//  *         schema:
//  *           type: string
//  *           enum: [daily, weekly, custom]
//  *         description: The date range for which to fetch the balance and profit (daily, weekly, or custom).
//  *       - in: query
//  *         name: startDate
//  *         required: false
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: The start date for custom range (required if range is custom).
//  *       - in: query
//  *         name: endDate
//  *         required: false
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: The end date for custom range (required if range is custom).
//  *     responses:
//  *       200:
//  *         description: A list of merchants with their balance and profit
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   merchant_id:
//  *                     type: integer
//  *                     description: The unique ID of the merchant.
//  *                     example: 123
//  *                   full_name:
//  *                     type: string
//  *                     description: The full name of the merchant.
//  *                     example: John Doe
//  *                   company_name:
//  *                     type: string
//  *                     description: The name of the merchant's company.
//  *                     example: Example Corp
//  *                   total_balance:
//  *                     type: string
//  *                     format: decimal
//  *                     description: The total settled balance of the merchant within the specified date range.
//  *                     example: "1500.50"
//  *                   profit:
//  *                     type: string
//  *                     format: decimal
//  *                     description: The calculated profit for the merchant within the specified date range.
//  *                     example: "150.05"
//  *       400:
//  *         description: Invalid input parameters (e.g., missing required fields)
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 error:
//  *                   type: string
//  *                   description: Error message explaining the invalid request.
//  *                   example: "Range is required"
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 error:
//  *                   type: string
//  *                   description: Error message explaining the server error.
//  *                   example: "Internal Server Error"
//  */
// router.get("/profits-balances", isLoggedIn, isAdmin, getAllProfitAndBalance);

// /**
//  * @swagger
//  * /admin_api/profit-balance/{merchantId}/:
//  *   get:
//  *     summary: Retrieve the balance and profit for a specific merchant within a given date range
//  *     tags:
//  *       - [AdminOnly]
//  *     description: >
//  *       Fetches the total balance and calculated profit for a specific merchant over a specified time range. 
//  *       The profit is calculated as a percentage of the settled amount based on the merchant's commission rate.
//  *     parameters:
//  *       - in: path
//  *         name: merchantId
//  *         required: true
//  *         schema:
//  *           type: integer
//  *         description: The ID of the merchant to retrieve the balance and profit for.
//  *         example: 123
//  *       - in: query
//  *         name: range
//  *         required: true
//  *         schema:
//  *           type: string
//  *           enum: [daily, weekly, custom]
//  *         description: The date range for which to fetch the balance and profit (daily, weekly, or custom).
//  *       - in: query
//  *         name: startDate
//  *         required: false
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: The start date for custom range (required if range is custom).
//  *       - in: query
//  *         name: endDate
//  *         required: false
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: The end date for custom range (required if range is custom).
//  *     responses:
//  *       200:
//  *         description: Balance and profit details for the specified merchant
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 merchant_id:
//  *                   type: integer
//  *                   description: The unique ID of the merchant.
//  *                   example: 123
//  *                 total_balance:
//  *                   type: string
//  *                   format: decimal
//  *                   description: The total settled balance of the merchant within the specified date range.
//  *                   example: "1500.50"
//  *                 profit:
//  *                   type: string
//  *                   format: decimal
//  *                   description: The calculated profit for the merchant within the specified date range.
//  *                   example: "150.05"
//  *       400:
//  *         description: Invalid input parameters (e.g., missing required fields or invalid merchantId)
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 error:
//  *                   type: string
//  *                   description: Error message explaining the invalid request.
//  *                   example: "Range or merchant id is required"
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 error:
//  *                   type: string
//  *                   description: Error message explaining the server error.
//  *                   example: "Internal Server Error"
//  */

// router.get("/profit-balance/:merchantId", isLoggedIn, isAdmin, getProfitAndBalanceByMerchant)