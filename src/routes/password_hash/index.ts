import { password_hash } from "../../controller/index.js"
import express from "express"
import { isAdmin, isLoggedIn } from "../../utils/middleware.js"

const router = express.Router()

router.post("/", [isLoggedIn, isAdmin], password_hash.passwordHash)

export default router;