import { Request, Response, Router } from "express";
import { login, logout, signup } from "../../controller/authentication/index.js";
import { validateLoginData } from "../../services/authentication/index.js";
import { isLoggedIn, isAdmin, authorize } from "../../utils/middleware.js";
import { populateEncryptedApiKeysForExistingUsers, populateEncryptedDecryptionKeysForExistingUsers } from "../../scripts/populateEncryptedApiKeys.js";
import { authenticationController } from "../../controller/index.js";

const router = Router();

router.get("/logout", logout);
router.get(
  "/generate-key/:id",
  [isLoggedIn],
  authorize("Setting"),
  authenticationController.createAPIKey
);
router.get(
  "/generate-api-key/:id",
  [isLoggedIn],
  authorize("Setting"),
  authenticationController.createDecryptionKey
);
router.post("/login", validateLoginData, login);
router.post("/signup", validateLoginData, signup);
router.get("/get-key/:id", [isLoggedIn], authorize("Setting"), authenticationController.getAPIKey);
router.get("/get-api-key/:id", [isLoggedIn], authorize("Setting"), authenticationController.getDecryptionKey);
// router.post(
//   "/populate_encrypted_api_keys",
//   [isLoggedIn, isAdmin],
//   async (req: Request, res: Response) => {
//     try {
//       await populateEncryptedApiKeysForExistingUsers();
//       res.status(200).json({
//         message: "Encrypted API keys populated for all existing users.",
//       });
//     } catch (error: any) {
//       res
//         .status(500)
//         .json({ message: error?.message || "Internal server error" });
//     }
//   }
// );
// router.post(
//   "/populate_encrypted_decryption_keys",
//   [isLoggedIn, isAdmin],
//   async (req: Request, res: Response) => {
//     try {
//       await populateEncryptedDecryptionKeysForExistingUsers();
//       res.status(200).json({
//         message: "Encrypted Decryption keys populated for all existing users.",
//       });
//     } catch (error: any) {
//       res
//         .status(500)
//         .json({ message: error?.message || "Internal server error" });
//     }
//   }
// );
router.post("/update-password",[isLoggedIn],authorize("Setting"),authenticationController.updatePassword)

export default router;

/**
 * @swagger
 * /auth_api/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *           example:
 *             email: johndoe@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login success
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Yes! You can login"
 *       401:
 *         description: Unauthorized - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "Invalid email or password"
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /auth_api/logout:
 *   get:
 *     summary: Logs out the user by clearing the authentication token.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User logged out successfully. The authentication token is cleared.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out Successfully"
 */
