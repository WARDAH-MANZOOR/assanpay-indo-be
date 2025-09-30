import express from 'express';
import { authorize, isAdmin, isLoggedIn } from '../../utils/middleware.js';
import { disbursementDispute } from '../../controller/index.js';
const router = express.Router();

router.post("/",[isLoggedIn], disbursementDispute.createDisbursementDispute);
router.patch("/status/:requestId",[isLoggedIn, isAdmin], disbursementDispute.updateDisbursementDisputeStatus);
router.get("/",[isLoggedIn], authorize("Reports"), disbursementDispute.getDisbursementDisputes);
router.get("/export",[isLoggedIn],authorize("Reports"),disbursementDispute.exportDisbursementDisputes);
export default router;