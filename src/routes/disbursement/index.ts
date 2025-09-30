import { isAdmin, isLoggedIn } from "../../utils/middleware.js";
import { disbursement } from "../../controller/index.js";
import { RequestHandler, Router } from "express";
import { apiKeyAuth } from "../../middleware/auth.js";

const router = Router();

const getDisbursementHandler: RequestHandler = async (req, res) => {
    await disbursement.getDisbursement(req,res);
} 

const exportDisbursementHandler: RequestHandler = async (req, res) => {
    await disbursement.exportDisbursement(req,res);
} 

const getAllMerchantsWalletBalancesHandler: RequestHandler = async (req, res,next) => {
    await disbursement.getAllMerchantsWalletBalancesController(req,res,next);
}

const getWalletBalanceControllerWithKeyHandler: RequestHandler = async (req, res,next) => {
    await disbursement.getWalletBalanceControllerWithKey(req,res,next)
}

const getDisbursementBalanceControllerWithKeyHandler: RequestHandler = async (req, res,next) => {
    await disbursement.getDisbursementBalanceControllerWithKey(req,res,next)
}

router.get("/", [isLoggedIn], getDisbursementHandler);
router.get("/export", [isLoggedIn], exportDisbursementHandler)
router.get("/available-balances", [isLoggedIn,isAdmin], getAllMerchantsWalletBalancesHandler);
router.get("/available-balance/:merchantId", 
    [apiKeyAuth], 
    getWalletBalanceControllerWithKeyHandler);
router.get('/tele', disbursement.getTeleDisbursement);
router.get("/disbursement-balance/:merchantId", 
    [apiKeyAuth], 
    getDisbursementBalanceControllerWithKeyHandler);


export default router;