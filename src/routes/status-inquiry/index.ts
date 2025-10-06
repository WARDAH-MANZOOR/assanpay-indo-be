import { apiKeyAuth } from "../../middleware/auth.js";
// import { dalalmartStatusInquiry, statusInquiry, shurjoPayStatusInquiry } from "../../controller/index.js";
import { RequestHandler, Router } from "express";
import { statusInquiry } from "../../controller/index.js";
// import { payinInquiry,payoutInquiry } from "controller/status-inquiry/index.js";
// import { payinInquiry,payoutInquiry } from "controller/status-inquiry/index.js";

const router = Router();

// const payinInquiryHandler: RequestHandler = async (req, res) => {
//     await statusInquiry.payinInquiry(req, res);
// };

// const payoutInquiryHandler: RequestHandler = async (req, res) => {
//     await statusInquiry.payoutInquiry(req, res);
// };

// const dalalMartpayinInquiryHandler: RequestHandler = async (req, res) => {
//     await dalalmartStatusInquiry.dalalMartPayinStatusInquiry(req, res);
// };

// const dalalMartpayoutInquiryHandler: RequestHandler = async (req, res) => {
//     await dalalmartStatusInquiry.dalalMartPayoutStatusInquiry(req, res);
// };

// const shurjoPayStatusInquiryHandler: RequestHandler = async (req, res) => {
//     await shurjoPayStatusInquiry.shurjoPayStatusInquiry(req, res);
// };




// router.get("/payin/:merchantId", payinInquiryHandler);
// router.get("/secured-payin/:merchantId", apiKeyAuth, payinInquiryHandler);
// router.get("/payout/:merchantId", payoutInquiryHandler);
// router.get("/secured-payout/:merchantId", apiKeyAuth, payoutInquiryHandler);
// router.get("/dalalmart/payin/:merchantId", dalalMartpayinInquiryHandler)
// router.get("/dalalmart/payout/:merchantId", dalalMartpayoutInquiryHandler)
// router.get("/shurjoPay/:merchantId", shurjoPayStatusInquiryHandler)


// ✅ StarPago
router.get("/starpago/payin/query", statusInquiry.starPagoPayIntStatusInquiry);
router.get("/starpago/payout/query", statusInquiry.starPagoPayOutStatusInquiry);
router.get("/starpago/balance", statusInquiry.queryStarPagoBalance);


export default router;