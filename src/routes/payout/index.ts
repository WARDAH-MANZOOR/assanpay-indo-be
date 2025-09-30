import { Request, Response, Router, RequestHandler } from "express";
import { dalalMartPayout, payout } from "../../controller/index.js";
import { apiKeyAuth } from "../../middleware/auth.js";

const router = Router();

const payoutHandler: RequestHandler = async (req, res) => {
    await payout.payout(req, res);
};

const dalalMartPayoutHandler: RequestHandler = async (req, res) => {
    await dalalMartPayout.dalalMartPayoutController(req,res)
}

router.post("/:merchantId", 
    // [apiKeyAuth], 
    payoutHandler);
router.post("/dalalmart/:merchantId", 
    [apiKeyAuth], 
    dalalMartPayoutHandler);
export default router;