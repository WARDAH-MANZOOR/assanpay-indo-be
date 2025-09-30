import { Router } from "express";
import { dashboardController } from "../../controller/index.js";
import { isLoggedIn, isAdmin, authorize } from "../../utils/middleware.js";
import {
  adminDashboardValidation,
  merchantDashboardValidation,
} from "../../validators/dashboard/index.js";
import { uidAuth } from "../../middleware/auth.js";

const router = Router();

// Define routes using arrow functions
router.get(
  "/merchant",
  [isLoggedIn, ...merchantDashboardValidation],
  authorize("Dashboard"),
  dashboardController.merchantDashboardDetails
);
router.get(
  "/merchant-details/:merchantId",
  [uidAuth, ...merchantDashboardValidation],
  // authorize("Dashboard"),
  dashboardController.merchantDashboardDetailsClone
);
router.get(
  "/admin",
  [isLoggedIn, isAdmin, ...adminDashboardValidation],
  dashboardController.adminDashboardDetails
);

// Globally apply middleware to all routes
router.use(isLoggedIn);

/**
 * @swagger
 * /dashboard/merchant:
 *   get:
 *     summary: Get merchant dashboard details
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant ID to retrieve dashboard details
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *         description: Start date for filtering transactions (optional)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *         description: End date for filtering transactions (optional)
 *     responses:
 *       200:
 *         description: Merchant dashboard details retrieved successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /dashboard/admin/:
 *   get:
 *     summary: Get admin dashboard details
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *         description: Start date for filtering transactions (optional)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *         description: End date for filtering transactions (optional)
 *     responses:
 *       200:
 *         description: Admin dashboard details retrieved successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

export default router;
