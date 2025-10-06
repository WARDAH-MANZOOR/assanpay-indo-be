import { Application } from "express";
// import autoCashin from "./payin/index.js"
import IndoPayin from "./payin/indoPayin.js"
import IndoPayout from "./payout/indoPayout.js"
import callback from "./callback/index.js"
import merchant from "./merchant/index.js";
import dashboard from "./dashboard/index.js";
import transaction from "./transaction/index.js";
import auth from "./authentication/index.js";
import settlement from "./settlement/index.js";
import backoffice from "./backoffice/backoffice.js";
import user from "./user/crud.js";
import disbursementRequest from "./disbursementRequest/index.js";
import report from "./reports/excel.js";
import ipn from "./ipn/index.js";
import express from "express";
import group from "./group/index.js"
import permissions from "./permissions/index.js"
import usdtSettlements from "./usdt-settlement/index.js"
import disbursementDispute from "./disbursementDispute/index.js"
import block_phone_number from "./block_phone_number/index.js"
import tele from "./tele/index.js"
import password_hash from "./password_hash/index.js"
import otp from "./otp/index.js"
import statusInquiry from "./status-inquiry/index.js"
// import payout from "./payout/index.js"
import disbursement from "./disbursement/index.js"
import chargeback from "./chargeback/index.js"
import topup from "./topup/index.js"

export default function (app: Application) {
    // app.use("/api/cashin", autoCashin);
    app.use("/api/payin", IndoPayin);
    app.use("/api/payout", IndoPayout);
    app.use("/api/callback", callback);
    app.use("/api/status-inquiry", statusInquiry);
    // app.use("/api/cashout", payout);
    app.use("/api/merchant", merchant);
    app.use("/api/dashboard", dashboard);
    app.use("/api/transactions", transaction);
    app.use("/api/auth", auth);
    app.use("/api/settlement", settlement);
    app.use("/api/backoffice", backoffice);
    app.use('/api/users', user);
    app.use('/api/disbursement-request', disbursementRequest);
    app.use('/api/report', report);
    app.use("/api/ipn", ipn);
    app.use("/api/group", group)
    app.use("/api/permissions", permissions)
    app.use("/api/usdt-settlement", usdtSettlements)
    app.use("/api/disbursement-dispute", disbursementDispute)
    app.use("/api/block", block_phone_number)
    app.use("/api/tele", tele)
    app.use("/api/password_hash", password_hash)
    app.use("/api/otp", otp)
    app.use("/api/disbursement", disbursement);
    app.use("/api/auth_api", auth)
    app.use("/api/chargeback", chargeback)
    app.use("/api/topup", topup)
}