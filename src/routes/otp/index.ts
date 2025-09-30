import { otpController } from "../../controller/index.js";
import { Router } from "express";

const express = Router();

express.post("/send-otp", otpController.sendOtp)

export default express;