import express, { Request, Response } from 'express';
import { authorize, isAdmin, isLoggedIn } from '../../utils/middleware.js';
import disbursementRequestController from "../../controller/disbursementRequest/index.js";
import disbursementRequestValidator from '../../validators/disbursementRequest/index.js';
const router = express.Router();

router.post("/",[isLoggedIn, ...disbursementRequestValidator.validateDisbursementRequest], authorize("Dashboard"), disbursementRequestController.createDisbursementRequest);
router.patch("/status/:requestId",[isLoggedIn, isAdmin, ...disbursementRequestValidator.updateDisbursementRequestStatus], disbursementRequestController.updateDisbursementRequestStatus);
router.get("/",[isLoggedIn], authorize("Reports"), disbursementRequestController.getDisbursementRequests);
router.get("/export",[isLoggedIn],authorize("Reports"),disbursementRequestController.exportDisbursementRequest);



export default router;