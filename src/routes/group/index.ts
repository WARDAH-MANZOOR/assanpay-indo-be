import { groupController } from "../../controller/index.js";
import express from "express";
import { isLoggedIn } from "../../utils/middleware.js";
import groupValidator from "../../validators/group/index.js"

const router = express.Router();

router.get("/", isLoggedIn, groupValidator.validateReadGroups, groupController.readGroupsController)
router.post("/", isLoggedIn, groupValidator.validateCreateGroup, groupController.createGroupController)
router.put("/:groupId", isLoggedIn, groupValidator.validateUpdateGroup, groupController.updateGroupPermissionsController)
router.delete("/:groupId", isLoggedIn, groupValidator.validateDeleteGroup, groupController.deleteGroupController)

export default router;