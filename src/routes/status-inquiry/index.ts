import { apiKeyAuth } from "../../middleware/auth.js";
import { dalalmartStatusInquiry, statusInquiry, shurjoPayStatusInquiry } from "../../controller/index.js";
import { RequestHandler, Router } from "express";

const router = Router();

const payinInquiryHandler: RequestHandler = async (req, res) => {
    await statusInquiry.payinInquiry(req, res);
};

const payoutInquiryHandler: RequestHandler = async (req, res) => {
    await statusInquiry.payoutInquiry(req, res);
};

const dalalMartpayinInquiryHandler: RequestHandler = async (req, res) => {
    await dalalmartStatusInquiry.dalalMartPayinStatusInquiry(req, res);
};

const dalalMartpayoutInquiryHandler: RequestHandler = async (req, res) => {
    await dalalmartStatusInquiry.dalalMartPayoutStatusInquiry(req, res);
};

const shurjoPayStatusInquiryHandler: RequestHandler = async (req, res) => {
    await shurjoPayStatusInquiry.shurjoPayStatusInquiry(req, res);
};

router.get("/payin/:merchantId", payinInquiryHandler);
router.get("/secured-payin/:merchantId", apiKeyAuth, payinInquiryHandler);
router.get("/payout/:merchantId", payoutInquiryHandler);
router.get("/secured-payout/:merchantId", apiKeyAuth, payoutInquiryHandler);
router.get("/dalalmart/payin/:merchantId", dalalMartpayinInquiryHandler)
router.get("/dalalmart/payout/:merchantId", dalalMartpayoutInquiryHandler)
router.get("/shurjoPay/:merchantId", shurjoPayStatusInquiryHandler)

export default router;