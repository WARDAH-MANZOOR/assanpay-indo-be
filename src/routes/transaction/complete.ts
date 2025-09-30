import { Request, Response, Router } from "express";
import prisma from "../../lib/prisma.js";
import { isLoggedIn } from "../../utils/middleware.js";
import { JwtPayload } from "jsonwebtoken";
import { addWeekdays } from "../../utils/date_method.js";

interface Provider {
    name: string;
    type: string;
    version: string;
}
interface CompleteRequest {
    transaction_id: string;
    status: string;
    provider: Provider;
}

const router = Router();
// Utility function for validation
const isValidTransactionCompletion = (data: CompleteRequest) => {
    const errors = [];

    // Validate transaction_id
    if (!data.transaction_id || !data.transaction_id.startsWith("T")) {
        errors.push({ msg: "Transaction ID must be a string", param: "transaction_id" });
    }

    // Validate status
    const validStatuses = ["completed", "failed"];
    if (!data.status || !validStatuses.includes(data.status)) {
        errors.push({ msg: "Invalid transaction status", param: "status" });
    }

    // Validate provider object if present
    if (data.provider) {
        if (!data.provider.name || typeof data.provider.name !== 'string') {
            errors.push({ msg: "Provider name must be a string", param: "provider.name" });
        }
        if (!data.provider.type || typeof data.provider.type !== 'string') {
            errors.push({ msg: "Provider transaction type must be a string", param: "provider.type" });
        }
        if (!data.provider.version || typeof data.provider.version !== 'string') {
            errors.push({ msg: "Provider version must be a string", param: "provider.version" });
        }
    }

    return errors;
};


// Transaction Completion API
export const completeTransaction = async (req: Request, res: Response) => {
    const { transaction_id, status, response_message, info, provider } = req.body;

    // Validate data
    const validationErrors = isValidTransactionCompletion(req.body);
    if (validationErrors.length > 0) {
         res.status(400).json({ errors: validationErrors });
         return
    }

    try {
        const transaction = await prisma.transaction.findUnique({
            where: {
                transaction_id: transaction_id,
                merchant_id: (req.user as JwtPayload)?.id,
                status: 'pending'
            }
        });

        if (transaction) {
            // Update the transaction as completed or failed
            let date = new Date();
            const updatedTransaction = await prisma.transaction.update({
                where: {
                    transaction_id: transaction_id,
                    merchant_id: (req.user as JwtPayload)?.id
                },
                data: {
                    date_time: date,
                    status: status,
                    response_message: response_message || null,
                    Provider: provider ? {
                        connectOrCreate: {
                            where: {
                                name_txn_type_version: {
                                    name: provider.name,
                                    txn_type: provider.type,
                                    version: provider.version
                                }
                            },
                            create: {
                                name: provider.name,
                                txn_type: provider.type,
                                version: provider.version
                            }
                        }
                    } : undefined,
                    AdditionalInfo: info ? {
                        create: {
                            bank_id: info.bank_id || null,
                            bill_reference: info.bill_reference || null,
                            retrieval_ref: info.retrieval_ref || null,
                            sub_merchant_id: info.sub_merchant_id || null,
                            settlement_expiry: info.settlement_expiry || null,
                            custom_field_1: info.custom_field_1 || null,
                            custom_field_2: info.custom_field_2 || null,
                            custom_field_3: info.custom_field_3 || null,
                            custom_field_4: info.custom_field_4 || null,
                            custom_field_5: info.custom_field_5 || null,
                        }
                    } : undefined
                }
            });

            const settlment = await prisma.merchantFinancialTerms.findUnique({
                where: { merchant_id: (req.user as JwtPayload)?.id }
            })
            const scheduledAt = addWeekdays(date, settlment?.settlementDuration as number);  // Call the function to get the next 2 weekdays

            let scheduledTask;
            if (status == "completed") {
                // Create the scheduled task in the database
                scheduledTask = await prisma.scheduledTask.create({
                    data: {
                        transactionId: transaction_id,
                        status: 'pending',
                        scheduledAt: scheduledAt,  // Assign the calculated weekday date
                        executedAt: null,  // Assume executedAt is null when scheduling
                    }
                });
            }


            // Send the response with the updated transaction
             res.status(200).json({ message: `Transaction ${status} successfully`, transaction: updatedTransaction, task: scheduledTask });
        }
        else {
             res.status(404).json({ message: "Transaction not found" });
        }

    } catch (error) {
        console.error(error);
         res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Provider:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The provider's name (e.g., JazzCash, Easypaisa).
 *           example: "JazzCash"
 *         type:
 *           type: string
 *           description: The type of the transaction by the provider (e.g., MWALLET).
 *           example: "MWALLET"
 *         version:
 *           type: string
 *           description: The version of the provider's transaction system.
 *           example: "1.1"
 *     TransactionCompletionRequest:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: string
 *           format: T*
 *           description: The unique ID of the transaction to complete.
 *           example: T20240928
 *         status:
 *           type: string
 *           description: The status of the transaction (e.g., completed, failed).
 *           example: "completed"
 *         response_message:
 *           type: string
 *           description: Optional response message from the transaction.
 *           example: "Transaction completed successfully"
 *         info:
 *           type: object
 *           description: Additional transaction information.
 *           properties:
 *             bank_id:
 *               type: string
 *               description: The bank ID involved in the transaction.
 *               example: "1234"
 *             bill_reference:
 *               type: string
 *               description: The reference number of the bill.
 *               example: "billRef123"
 *             retrieval_ref:
 *               type: string
 *               description: The retrieval reference number.
 *               example: "409266770834"
 *             sub_merchant_id:
 *               type: string
 *               description: The sub-merchant ID.
 *               example: "subMerchant123"
 *             settlement_expiry:
 *               type: string
 *               description: The expiry date for settlement.
 *               example: "2024-12-31"
 *             custom_field_1:
 *               type: string
 *               example: "customValue1"
 *             custom_field_2:
 *               type: string
 *               example: "customValue2"
 *             custom_field_3:
 *               type: string
 *               example: "customValue3"
 *             custom_field_4:
 *               type: string
 *               example: "customValue4"
 *             custom_field_5:
 *               type: string
 *               example: "customValue5"
 *         provider:
 *           $ref: '#/components/schemas/Provider'
 *     TransactionCompletionResponse:
 *       type: object
 *       properties: 
 *         message:
 *           type: string
 *           example: "Transaction completed successfully"
 *         transaction:
 *           type: object
 *           description: The updated transaction object.
 *           properties:
 *             transaction_id:
 *               type: string
 *               format: T*
 *               description: The unique ID of the transaction.
 *               example: T20240928
 *             status:
 *               type: string
 *               description: The updated status of the transaction.
 *               example: "completed"
 *             response_message:
 *               type: string
 *               example: "Transaction completed successfully"
 *             AdditionalInfo:
 *               type: object
 *               description: Additional information related to the transaction.
 *               properties:
 *                 bank_id:
 *                   type: string
 *                   example: "1234"
 *                 bill_reference:
 *                   type: string
 *                   example: "billRef123"
 *                 retrieval_ref:
 *                   type: string
 *                   example: "409266770834"
 *                 sub_merchant_id:
 *                   type: string
 *                   example: "subMerchant123"
 *                 settlement_expiry:
 *                   type: string
 *                   example: "2024-12-31"
 *                 custom_field_1:
 *                   type: string
 *                   example: "customValue1"
 *                 custom_field_2:
 *                   type: string
 *                   example: "customValue2"
 *                 custom_field_3:
 *                   type: string
 *                   example: "customValue3"
 *                 custom_field_4:
 *                   type: string
 *                   example: "customValue4"
 *                 custom_field_5:
 *                   type: string
 *                   example: "customValue5"
 *
 * /transaction_complete/:
 *   put:
 *     summary: Complete a transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionCompletionRequest'
 *     responses:
 *       200:
 *         description: Transaction completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionCompletionResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                         description: Error message
 *                         example: "Invalid transaction_id"
 *                       param:
 *                         type: string
 *                         description: Parameter that caused the validation error
 *                         example: "transaction_id"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */

router.put("/", isLoggedIn, completeTransaction);
export default router;