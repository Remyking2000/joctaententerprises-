import { Router } from "express";
import { googleAuthInputSchema } from "@jocta/shared";
import { AuthController } from "../controllers/auth.controller.js";
import { validateRequest } from "../middleware/error.middleware.js";

const router = Router();

router.post(
  "/google",
  validateRequest({ body: googleAuthInputSchema }),
  AuthController.googleLogin,
);

router.get("/me", AuthController.getMe);
router.post("/logout", AuthController.logout);

export default router;
