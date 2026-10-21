import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
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
  updateProfileSchema,
  verifyEmailChangeSchema,
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
authRouter.patch(
  "/me",
  authenticate,
  rateLimit({ name: "profile-update", max: 30, windowSeconds: 15 * MINUTE }),
  validate(updateProfileSchema),
  authController.updateProfile,
);
// Clients only: the Super Admin is seeded by SEED_SUPER_ADMIN_EMAIL, so its email must not change here.
authRouter.post(
  "/me/email",
  authenticate,
  authorize(UserRole.CLIENT),
  rateLimit({ name: "email-change-request", max: 10, windowSeconds: HOUR }),
  validate(emailOnlySchema),
  authController.requestEmailChange,
);
authRouter.post(
  "/me/email/verify",
  authenticate,
  authorize(UserRole.CLIENT),
  rateLimit({ name: "email-change-verify", max: 30, windowSeconds: 15 * MINUTE }),
  validate(verifyEmailChangeSchema),
  authController.confirmEmailChange,
);
authRouter.delete(
  "/me/email",
  authenticate,
  authorize(UserRole.CLIENT),
  rateLimit({ name: "email-remove", max: 10, windowSeconds: HOUR }),
  authController.removeEmail,
);
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
