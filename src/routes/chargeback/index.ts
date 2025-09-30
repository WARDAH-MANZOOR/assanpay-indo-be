import { chargeback } from "../../controller/index.js";
import express from "express"
import { authorize, isAdmin, isLoggedIn } from "../../utils/middleware.js";
import chargebackValidator from "../../validators/chargeback/index.js"

const router = express.Router();

router.post("/",
    // [isLoggedIn, isAdmin, 
        ...chargebackValidator.validateChargeBack
    // ], 
        ,chargebackValidator.handleValidationErrors, chargeback.createChargeback);
router.get("/",
    [isLoggedIn], authorize("Reports"), 
    chargeback.getChargebacks);
router.get("/export",
    [isLoggedIn],authorize("Reports"),
    chargeback.exportChargebacks);
export default router;