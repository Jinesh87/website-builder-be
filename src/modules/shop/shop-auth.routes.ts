import { Router } from "express";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { shopAuthController } from "./controllers/shop-auth.controller.js";
import { authenticateShopCustomer } from "./middleware/authenticate-shop-customer.js";
import {
  shopAddToCartSchema,
  shopAuthWebsiteParamsSchema,
  shopCartItemParamsSchema,
  shopChangePasswordSchema,
  shopCheckoutConfirmSchema,
  shopEmailOnlySchema,
  shopOrderParamsSchema,
  shopLoginSchema,
  shopProfileUpdateSchema,
  shopResetPasswordSchema,
  shopSignupSchema,
  shopUpdateCartItemSchema,
  shopVerifyEmailSchema,
} from "./validators/shop-auth.validator.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const websiteParams = validate(shopAuthWebsiteParamsSchema, "params");

const shopAuthRouter = Router({ mergeParams: true });

shopAuthRouter.post(
  "/signup",
  websiteParams,
  rateLimit({ name: "shop-signup", max: 10, windowSeconds: HOUR }),
  validate(shopSignupSchema),
  shopAuthController.signup,
);
shopAuthRouter.post(
  "/verify-email",
  websiteParams,
  rateLimit({ name: "shop-verify-email", max: 30, windowSeconds: 15 * MINUTE }),
  validate(shopVerifyEmailSchema),
  shopAuthController.verifyEmail,
);
shopAuthRouter.post(
  "/resend-verification",
  websiteParams,
  rateLimit({ name: "shop-resend-verification", max: 10, windowSeconds: HOUR }),
  validate(shopEmailOnlySchema),
  shopAuthController.resendVerification,
);
shopAuthRouter.post(
  "/login",
  websiteParams,
  rateLimit({ name: "shop-login", max: 30, windowSeconds: 15 * MINUTE }),
  validate(shopLoginSchema),
  shopAuthController.login,
);
shopAuthRouter.post("/refresh", websiteParams, shopAuthController.refresh);
shopAuthRouter.post("/logout", websiteParams, shopAuthController.logout);
shopAuthRouter.get("/me", websiteParams, authenticateShopCustomer, shopAuthController.me);
shopAuthRouter.get("/account", websiteParams, authenticateShopCustomer, shopAuthController.account);
shopAuthRouter.patch(
  "/profile",
  websiteParams,
  authenticateShopCustomer,
  validate(shopProfileUpdateSchema),
  shopAuthController.updateProfile,
);
shopAuthRouter.post(
  "/change-password",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-change-password", max: 10, windowSeconds: 15 * MINUTE }),
  validate(shopChangePasswordSchema),
  shopAuthController.changePassword,
);
shopAuthRouter.post(
  "/forgot-password",
  websiteParams,
  rateLimit({ name: "shop-forgot-password", max: 5, windowSeconds: 15 * MINUTE }),
  validate(shopEmailOnlySchema),
  shopAuthController.forgotPassword,
);
shopAuthRouter.post(
  "/reset-password",
  websiteParams,
  rateLimit({ name: "shop-reset-password", max: 10, windowSeconds: 15 * MINUTE }),
  validate(shopResetPasswordSchema),
  shopAuthController.resetPassword,
);

shopAuthRouter.get("/cart", websiteParams, authenticateShopCustomer, shopAuthController.listCart);
shopAuthRouter.post(
  "/cart",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-add-to-cart", max: 60, windowSeconds: MINUTE }),
  validate(shopAddToCartSchema),
  shopAuthController.addToCart,
);
shopAuthRouter.patch(
  "/cart/:itemId",
  validate(shopCartItemParamsSchema, "params"),
  authenticateShopCustomer,
  validate(shopUpdateCartItemSchema),
  shopAuthController.updateCartItem,
);
shopAuthRouter.delete(
  "/cart/:itemId",
  validate(shopCartItemParamsSchema, "params"),
  authenticateShopCustomer,
  shopAuthController.removeCartItem,
);

shopAuthRouter.post(
  "/checkout",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-checkout", max: 20, windowSeconds: MINUTE }),
  shopAuthController.startCheckout,
);
shopAuthRouter.post(
  "/checkout/confirm",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-checkout-confirm", max: 30, windowSeconds: MINUTE }),
  validate(shopCheckoutConfirmSchema),
  shopAuthController.confirmCheckout,
);
shopAuthRouter.get(
  "/orders/:orderId",
  validate(shopOrderParamsSchema, "params"),
  authenticateShopCustomer,
  shopAuthController.getOrder,
);

export default shopAuthRouter;
