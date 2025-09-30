import { ipnController } from "../../controller/index.js";
import express from "express";

const router = express.Router();

router.post("/devtects", ipnController.handleIPN);
router.post("/sasta-tech", ipnController.handleIPN);
router.post("/digifytive", ipnController.handleIPN);
router.post("/learningization", ipnController.handleIPN);
router.post("/monic-tech", ipnController.handleIPN);
router.post("/think-tech", ipnController.handleIPN);
router.post("/digicore", ipnController.handleIPN);
router.post("/evolvica", ipnController.handleIPN);
router.post("/card", ipnController.handleCardIPN);
router.post("/bdt", ipnController.handlebdtIPN);
router.post("/shurjopay", ipnController.handleShurjopayIPN);
router.post("/bkash-setup", ipnController.handleBkashSetupIPN);

export default router;