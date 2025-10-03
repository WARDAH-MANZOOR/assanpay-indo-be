import { Router } from "express";
import { payout,starPagoCallback } from "../../controller/index.js";


const router = Router();

// Generic Payin Route (Indo wallets like OVO, DANA, QRIS, etc.)
router.post("/:merchantId", payout.IndoPayout);

// Webhook endpoints (these are called by providers, not Postman directly)
router.post("/callback-PayOut/starpago", starPagoCallback.StarPagoPayoutCallback);


export default router;
