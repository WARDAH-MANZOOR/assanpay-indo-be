import { Router, RequestHandler } from "express";
import { callback, launcxCallback, starPagoCallback } from "../../controller/index.js";
import { checkWebhookSecret } from "../../utils/middleware.js";

const router = Router();

const callbackHandler: RequestHandler = async (req, res) => {
    await callback.callbackController(req, res);
};

const payoutCallbackHandler: RequestHandler = async (req, res) => {
    await callback.payoutCallbackController(req, res);
};
const dummyCallbackHandler: RequestHandler = async (req, res) => {
    await callback.dummyCallback(req, res);
};

// const dalalMartCallbackHandler: RequestHandler = async (req, res) => {
//     await dalalmartCallback.dalalMartCallbackController(req, res);
// };

// const dalalMartPayoutCallbackHandler: RequestHandler = async (req, res) => {
//     await dalalmartCallback.dalalMartPayoutCallbackController(req, res);
// };

router.post("/payin/", callbackHandler);
router.post("/payout/", payoutCallbackHandler);
router.post("/dummy",dummyCallbackHandler);
// router.post("/dalalmart/",dalalMartCallbackHandler);
// router.post("/dalalmart/payout/", [checkWebhookSecret],dalalMartPayoutCallbackHandler);

router.post("/starpago/payout", starPagoCallback.StarPagoPayoutCallback);
router.post("launcx/payin", launcxCallback.LauncxPaynInCallback);
router.post("/starpago/payin", starPagoCallback.StarPagoPayInCallback);

export default router;