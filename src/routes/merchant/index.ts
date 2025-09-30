import { Router } from "express";
import { merchantController } from "../../controller/index.js";
import { isLoggedIn, isAdmin, authorize } from "../../utils/middleware.js";
import { addMerchantValidation, updateMerchantValidation } from "../../validators/merchant/index.js";


const router = Router();

router.get("/", [isLoggedIn, isAdmin], merchantController.getMerchants);
router.put("/", [isLoggedIn, isAdmin, ...updateMerchantValidation], merchantController.updateMerchant);
router.post("/", [isLoggedIn, isAdmin, ...addMerchantValidation], merchantController.addMerchant);
router.post("/set-percent", [isLoggedIn], authorize("Dashboard"), merchantController.setDisbursePercent);



/**
 * @swagger
 * /merchant/:
 *   get:
 *     summary: Get a list of all merchants
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants retrieved successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /merchant/:
 *   put:
 *     summary: Update an existing merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Merchant data to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               company_name:
 *                 type: string
 *               city:
 *                 type: string
 *               payment_volume:
 *                 type: number
 *               commission:
 *                 type: number
 *               settlementDuration:
 *                 type: number
 *               jazzCashMerchantId:
 *                 type: string
 *               easyPaisaMerchantId:
 *                 type: string
 *               swichMerchantId:
 *                 type: string
 *               webhook_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /merchant/:
 *   post:
 *     summary: Add a new merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: New merchant data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               company_name:
 *                 type: string
 *               city:
 *                 type: string
 *               payment_volume:
 *                 type: number
 *               commission:
 *                 type: number
 *               settlementDuration:
 *                 type: number
 *               jazzCashMerchantId:
 *                 type: string
 *               easyPaisaMerchantId:
 *                 type: string
 *               swichMerchantId:
 *                 type: string
 *               webhook_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Merchant created successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

export default router;
