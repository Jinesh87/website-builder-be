import { Router } from "express";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { shopAuthController } from "./controllers/shop-auth.controller.js";
import { authenticateShopCustomer } from "./middleware/authenticate-shop-customer.js";
import { ensureShopGuestSession } from "./middleware/ensure-shop-guest-session.js";
import {
  shopAddToCartSchema,
  shopAddToWishlistSchema,
  shopAddressParamsSchema,
  shopAddressSchema,
  shopAuthWebsiteParamsSchema,
  shopCartItemParamsSchema,
  shopChangePasswordSchema,
  shopCancelOrderSchema,
  shopReturnOrderSchema,
  shopCheckoutConfirmSchema,
  shopCheckoutStartSchema,
  shopEmailOnlySchema,
  shopGuestAddressSchema,
  shopGuestCheckoutStartSchema,
  shopOrderParamsSchema,
  shopProductParamsSchema,
  shopLoginSchema,
  shopProfileUpdateSchema,
  shopResetPasswordSchema,
  shopSignupSchema,
  shopTrackParamsSchema,
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
shopAuthRouter.get("/addresses", websiteParams, authenticateShopCustomer, shopAuthController.listAddresses);
shopAuthRouter.post(
  "/addresses",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-address-write", max: 30, windowSeconds: MINUTE }),
  validate(shopAddressSchema),
  shopAuthController.createAddress,
);
shopAuthRouter.patch(
  "/addresses/:addressId",
  validate(shopAddressParamsSchema, "params"),
  authenticateShopCustomer,
  rateLimit({ name: "shop-address-write", max: 30, windowSeconds: MINUTE }),
  validate(shopAddressSchema),
  shopAuthController.updateAddress,
);
shopAuthRouter.delete(
  "/addresses/:addressId",
  validate(shopAddressParamsSchema, "params"),
  authenticateShopCustomer,
  rateLimit({ name: "shop-address-write", max: 30, windowSeconds: MINUTE }),
  shopAuthController.deleteAddress,
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

shopAuthRouter.get("/guest/cart", websiteParams, ensureShopGuestSession, shopAuthController.listGuestCart);
shopAuthRouter.post(
  "/guest/cart",
  websiteParams,
  ensureShopGuestSession,
  rateLimit({ name: "shop-guest-add-to-cart", max: 60, windowSeconds: MINUTE }),
  validate(shopAddToCartSchema),
  shopAuthController.addGuestCart,
);
shopAuthRouter.patch(
  "/guest/cart/:itemId",
  validate(shopCartItemParamsSchema, "params"),
  ensureShopGuestSession,
  validate(shopUpdateCartItemSchema),
  shopAuthController.updateGuestCartItem,
);
shopAuthRouter.delete(
  "/guest/cart/:itemId",
  validate(shopCartItemParamsSchema, "params"),
  ensureShopGuestSession,
  shopAuthController.removeGuestCartItem,
);
shopAuthRouter.get("/guest/addresses", websiteParams, ensureShopGuestSession, shopAuthController.listGuestAddresses);
shopAuthRouter.post(
  "/guest/addresses",
  websiteParams,
  ensureShopGuestSession,
  rateLimit({ name: "shop-guest-address-write", max: 40, windowSeconds: MINUTE }),
  validate(shopGuestAddressSchema),
  shopAuthController.saveGuestAddress,
);
shopAuthRouter.delete(
  "/guest/addresses/:addressId",
  validate(shopAddressParamsSchema, "params"),
  ensureShopGuestSession,
  shopAuthController.deleteGuestAddress,
);
shopAuthRouter.get("/guest/wishlist", websiteParams, ensureShopGuestSession, shopAuthController.listGuestWishlist);
shopAuthRouter.post(
  "/guest/wishlist",
  websiteParams,
  ensureShopGuestSession,
  rateLimit({ name: "shop-guest-wishlist-write", max: 60, windowSeconds: MINUTE }),
  validate(shopAddToWishlistSchema),
  shopAuthController.addGuestWishlist,
);
shopAuthRouter.delete(
  "/guest/wishlist/:variantId",
  validate(shopProductParamsSchema, "params"),
  ensureShopGuestSession,
  shopAuthController.removeGuestWishlist,
);
shopAuthRouter.post(
  "/guest/checkout",
  websiteParams,
  ensureShopGuestSession,
  rateLimit({ name: "shop-guest-checkout", max: 20, windowSeconds: MINUTE }),
  validate(shopGuestCheckoutStartSchema),
  shopAuthController.startGuestCheckout,
);
shopAuthRouter.post(
  "/guest/checkout/confirm",
  websiteParams,
  ensureShopGuestSession,
  rateLimit({ name: "shop-guest-checkout-confirm", max: 30, windowSeconds: MINUTE }),
  validate(shopCheckoutConfirmSchema),
  shopAuthController.confirmGuestCheckout,
);
shopAuthRouter.get(
  "/track/:token",
  validate(shopTrackParamsSchema, "params"),
  rateLimit({ name: "shop-track-order", max: 60, windowSeconds: MINUTE }),
  shopAuthController.trackOrder,
);
shopAuthRouter.get(
  "/track/:token/invoice",
  validate(shopTrackParamsSchema, "params"),
  rateLimit({ name: "shop-track-invoice", max: 30, windowSeconds: MINUTE }),
  shopAuthController.trackOrderInvoice,
);

shopAuthRouter.get("/wishlist", websiteParams, authenticateShopCustomer, shopAuthController.listWishlist);
shopAuthRouter.post(
  "/wishlist",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-wishlist-write", max: 60, windowSeconds: MINUTE }),
  validate(shopAddToWishlistSchema),
  shopAuthController.addToWishlist,
);
shopAuthRouter.delete(
  "/wishlist/:variantId",
  validate(shopProductParamsSchema, "params"),
  authenticateShopCustomer,
  shopAuthController.removeFromWishlist,
);

shopAuthRouter.post(
  "/checkout",
  websiteParams,
  authenticateShopCustomer,
  rateLimit({ name: "shop-checkout", max: 20, windowSeconds: MINUTE }),
  validate(shopCheckoutStartSchema),
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
shopAuthRouter.get(
  "/orders/:orderId/invoice",
  validate(shopOrderParamsSchema, "params"),
  authenticateShopCustomer,
  shopAuthController.downloadOrderInvoice,
);
shopAuthRouter.post(
  "/orders/:orderId/cancel",
  validate(shopOrderParamsSchema, "params"),
  authenticateShopCustomer,
  rateLimit({ name: "shop-cancel-order", max: 10, windowSeconds: MINUTE }),
  validate(shopCancelOrderSchema),
  shopAuthController.cancelOrder,
);
shopAuthRouter.post(
  "/orders/:orderId/return",
  validate(shopOrderParamsSchema, "params"),
  authenticateShopCustomer,
  rateLimit({ name: "shop-return-order", max: 10, windowSeconds: MINUTE }),
  validate(shopReturnOrderSchema),
  shopAuthController.returnOrder,
);

export default shopAuthRouter;
