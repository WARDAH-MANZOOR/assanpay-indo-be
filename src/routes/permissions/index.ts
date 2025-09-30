import { Router } from "express"
import { permissionController } from "../../controller/index.js"
import { isLoggedIn } from "../../utils/middleware.js";

const router = Router()

router.get('/',[isLoggedIn], permissionController.getPermissions)

export default router;
