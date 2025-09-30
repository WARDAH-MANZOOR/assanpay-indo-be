import { topup } from "../../controller/index.js";
import express from "express"
import { authorize, isAdmin, isLoggedIn } from "../../utils/middleware.js";
import chargebackValidator from "../../validators/chargeback/index.js"

const router = express.Router();

router.post("/",
    [isLoggedIn, isAdmin], chargebackValidator.handleValidationErrors, 
    topup.createTopup);
router.get("/",
    [isLoggedIn], authorize("Reports"), 
    topup.getTopups);
router.get("/export",
    [isLoggedIn],authorize("Reports"),
    topup.exportTopups);
export default router;