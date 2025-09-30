import { usdtSettlementController } from "../../controller/index.js";
import { Router } from "express";
import { isLoggedIn } from "../../utils/middleware.js";

const router = Router();

router.get("/",[isLoggedIn],usdtSettlementController.getUsdtSettlements)
router.get("/export",[isLoggedIn],usdtSettlementController.exportUsdtSettlements)

export default router;