import { Request, Response, Router, RequestHandler } from "express";
import { autoCashin, dalalmartPayin } from "../../controller/index.js";

const router = Router();

const autoCashinHandler: RequestHandler = async (req, res) => {
    await autoCashin.autoCashinController(req, res);
};

const directCashinHandler: RequestHandler = async (req, res) => {
    await autoCashin.payin(req, res);
}

const dalalMartCashinHandler: RequestHandler = async (req, res) => {
    await dalalmartPayin.dalalMartPayin(req, res);
}

router.post("/auto/:merchantId", autoCashinHandler);
router.post("/direct/:merchantId", directCashinHandler);
router.post("/dalal/:merchantId", dalalMartCashinHandler);

export default router;