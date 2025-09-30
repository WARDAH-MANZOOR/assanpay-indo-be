import express from 'express';
import backOfficeController from '../../controller/backoffice/backoffice.js';
import backOfficeValidator from '../../validators/backoffice/index.js';
import { authorize, isAdmin, isLoggedIn } from '../../utils/middleware.js';
const router = express.Router();

// Define routes
router.post('/remove-finance/:merchantId', [isLoggedIn, isAdmin], backOfficeController.removeMerchantFinanceData);

router.post('/zero-wallet/:merchantId', [isLoggedIn, isAdmin], backOfficeController.zeroMerchantWalletBalance);

router.post('/adjust-wallet/:merchantId',  [isLoggedIn, isAdmin], backOfficeController.adjustMerchantWalletBalance);

router.post('/adjust-wallet-without/:merchantId',  [isLoggedIn, isAdmin], backOfficeController.adjustMerchantWalletBalanceWithoutSettlement);

router.get('/transaction-stats/:merchantId', [isLoggedIn, isAdmin], backOfficeController.checkMerchantTransactionStats);

router.post('/settle-transactions', [isLoggedIn, isAdmin], backOfficeController.settleTransactions);

router.post('/settle-transactions/tele', backOfficeController.settleTransactionsForTelegram);

router.post('/settle-disbursements/tele', backOfficeController.settleDisbursementsForTelegram);

router.post('/fail-transactions/tele', backOfficeController.failTransactionsForTelegram);

router.post('/fail-disbursements/tele', backOfficeController.failDisbursementsForTelegram);

router.post('/fail-disbursements-account-invalid/tele', backOfficeController.failDisbursementsWithAccountInvalidForTelegram);

router.post('/settle-all/:merchantId', [isLoggedIn, isAdmin], backOfficeController.settleAllMerchantTransactions);

router.post('/settle-all-upd/:merchantId', [isLoggedIn, isAdmin], backOfficeController.settleAllMerchantTransactionsUpdated);

router.post("/dummy-transaction/:merchantId",[isLoggedIn, isAdmin], backOfficeController.createTransactionController)

router.delete("/delete-merchant-data/:merchantId",[isLoggedIn, isAdmin], backOfficeController.deleteMerchantDataController)

router.post("/payin-callback",backOfficeController.payinCallback)

router.post("/payout-callback",backOfficeController.payoutCallback)

router.post("/div-settlements",[isLoggedIn, isAdmin], backOfficeController.divideSettlementRecords)

router.get("/process-today",[isLoggedIn, isAdmin], backOfficeController.processTodaySettlements)

router.post("/usdt-settlement",[isLoggedIn, isAdmin, ...backOfficeValidator.validateSettlement], backOfficeValidator.handleValidationErrors, backOfficeController.createUSDTSettlement)

router.post("/reconcile/:merchantId",[isLoggedIn, isAdmin], backOfficeValidator.handleValidationErrors, backOfficeController.calculateFinancials)

router.post("/adjust-disbursement/:merchantId",[isLoggedIn, isAdmin], backOfficeController.adjustMerchantDisbursementBalance)
export default router;