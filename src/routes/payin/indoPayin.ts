import { Router } from "express";
import { autoCashin,launcxCallback,starPagoCallback } from "../../controller/index.js";


const router = Router();

// Generic Payin Route (Indo wallets like OVO, DANA, QRIS, etc.)
router.post("/:merchantId", autoCashin.IndoPayin);

// Webhook endpoints (these are called by providers, not Postman directly)
router.post("/callback/launcx", launcxCallback.LauncxPaynInCallback);
router.post("/callback-PayIn/starpago", starPagoCallback.StarPagoPayInCallback);
router.post("/callback-PayOut/starpago", starPagoCallback.StarPagoPayoutCallback);


export default router;
