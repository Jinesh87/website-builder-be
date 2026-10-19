import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { authController } from "./controllers/auth.controller.js";
import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  resetPasswordQuerySchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "./validators/auth.validator.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const authRouter = Router();

authRouter.post(
  "/signup",
  rateLimit({ name: "signup", max: 10, windowSeconds: HOUR }),
  validate(signupSchema),
  authController.signup,
);
authRouter.post(
  "/verify-email",
  rateLimit({ name: "verify-email", max: 30, windowSeconds: 15 * MINUTE }),
  validate(verifyEmailSchema),
  authController.verifyEmail,
);
authRouter.post(
  "/resend-verification",
  rateLimit({ name: "resend-verification", max: 10, windowSeconds: HOUR }),
  validate(emailOnlySchema),
  authController.resendVerification,
);
authRouter.post(
  "/login",
  rateLimit({ name: "login", max: 30, windowSeconds: 15 * MINUTE }),
  validate(loginSchema),
  authController.login,
);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.post(
  "/forgot-password",
  rateLimit({ name: "forgot-password", max: 5, windowSeconds: 15 * MINUTE }),
  validate(emailOnlySchema),
  authController.forgotPassword,
);
authRouter.get(
  "/reset-password",
  rateLimit({ name: "reset-preview", max: 30, windowSeconds: 15 * MINUTE }),
  validate(resetPasswordQuerySchema, "query"),
  authController.getResetPreview,
);
authRouter.post(
  "/reset-password",
  rateLimit({ name: "reset-password", max: 10, windowSeconds: 15 * MINUTE }),
  validate(resetPasswordSchema),
  authController.resetPassword,
);
authRouter.post(
  "/change-password",
  authenticate,
  rateLimit({ name: "change-password", max: 10, windowSeconds: 15 * MINUTE }),
  validate(changePasswordSchema),
  authController.changePassword,
);

export default authRouter;
