import { block_phone_number } from "../../controller/index.js";
import express from "express"
import { isAdmin, isLoggedIn } from "../../utils/middleware.js";

const router = express.Router();

router.post("/", [isLoggedIn, isAdmin], block_phone_number.addBlockedNumber)
router.get("/", [isLoggedIn, isAdmin], block_phone_number.getBlockedNumbers)

export default router;