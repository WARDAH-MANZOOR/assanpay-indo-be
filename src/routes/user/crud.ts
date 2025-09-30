import { Router } from "express";
import userController from "../../controller/user/crud.js";
import userValidator from "../../validators/user/crud.js"
import { isLoggedIn } from "../../utils/middleware.js";
const router = Router();

router.post('/', [isLoggedIn], ...userValidator.createUserValidator, userValidator.handleValidationErrors, userController.createUser);
router.get('/', [isLoggedIn], userValidator.handleValidationErrors, userController.getUsers);
router.put('/:userId', [isLoggedIn], ...userValidator.updateUserValidator, userValidator.handleValidationErrors, userController.updateUser);
router.delete('/:userId', [isLoggedIn], ...userValidator.deleteUserValidator, userValidator.handleValidationErrors, userController.deleteUser);

export default router;