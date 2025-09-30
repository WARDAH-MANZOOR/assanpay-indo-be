import { exportSettlements, getSettlements } from "../../controller/settlement/index.js";
import { Router } from "express";
import { authorize, isLoggedIn } from "../../utils/middleware.js";

const router = Router();

router.get("/", [isLoggedIn], authorize("Reports"), getSettlements);
router.get("/export", [isLoggedIn], authorize("Reports"), exportSettlements);

export default router;