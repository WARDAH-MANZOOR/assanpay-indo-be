import { NextFunction, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { BusinessSmsApi } from "../../utils/business_sms_api.js";

const smsApi = new BusinessSmsApi({ id: 'devtects', pass: 'devtects1122' });

function generateOTP() {
    return Math.floor(10000 + Math.random() * 90000).toString(); // Ensures 5 digits
}

const sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { accountNo, payId } = req.body;
        const otp = generateOTP(); // Generate the OTP
        const msg = `OTP: ${otp}`;
        const result = await smsApi.sendSms({ to: accountNo, mask: "80223", msg, lang: "English", type: "Xml" });
        await prisma.paymentRequest.update({
            where: {
                id: payId
            },
            data: {
                metadata: {
                    otp: otp,
                    phone: accountNo
                }
            }
        })
        res.json({ success: true, response: result });
    } catch (error: any) {
        // res.status(500).json({ success: false, error: error.message });
        next(error)
    }
}

export default {
    sendOtp
}