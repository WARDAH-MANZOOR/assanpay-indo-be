import { reportController } from '../../controller/index.js';
import express from 'express';
import { isAdmin, isLoggedIn } from '../../utils/middleware.js';

const router = express.Router();

router.get('/excel', [isLoggedIn, isAdmin], reportController.generateExcelReportController as express.RequestHandler);
router.get('/payin-per-wallet', reportController.payinPerWalletController as express.RequestHandler);
router.get('/payout-per-wallet', reportController.payoutPerWalletController as express.RequestHandler);
router.get('/pending-settlements',reportController.getPendingSettlements as unknown as express.RequestHandler)

export default router; 