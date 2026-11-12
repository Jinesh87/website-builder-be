import type { NextFunction, Request, Response } from "express";
import { clearShopAuthCookies, getShopRefreshToken, setShopAuthCookies } from "../../../common/utils/cookies.js";
import { shopAuthService } from "../services/shop-auth.service.js";
import { shopCheckoutService } from "../services/shop-checkout.service.js";
import { shopGuestService } from "../services/shop-guest.service.js";
import { shopInvoiceService } from "../services/shop-invoice.service.js";
import type { ShopAuthResult } from "../types/shop-auth.types.js";
import { htmlToPdf } from "../utils/html-to-pdf.js";

type WebsiteParams = { websiteId: string };

function sendSession(res: Response, result: ShopAuthResult) {
  setShopAuthCookies(res, result.tokens, result.remember);
  res.status(200).json({ customer: result.customer });
}

export class ShopAuthController {
  signup = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await shopAuthService.signup(req.params.websiteId, req.body));
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.verifyEmail(req.params.websiteId, req.body.email, req.body.code));
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await shopAuthService.resendVerification(req.params.websiteId, req.body.email));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.login(req.params.websiteId, req.body));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getShopRefreshToken(req);
      if (!refreshToken) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Refresh token missing" } });
        return;
      }
      sendSession(res, await shopAuthService.refresh(req.params.websiteId, refreshToken));
    } catch (error) {
      clearShopAuthCookies(res);
      next(error);
    }
  };

  logout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopAuthService.logout(getShopRefreshToken(req));
      clearShopAuthCookies(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        customer: await shopAuthService.me(req.params.websiteId, req.shopCustomer!.id),
      });
    } catch (error) {
      next(error);
    }
  };

  account = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await shopAuthService.account(req.params.websiteId, req.shopCustomer!.id));
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        customer: await shopAuthService.updateProfile(req.params.websiteId, req.shopCustomer!.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  listAddresses = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopAuthService.listAddresses(req.params.websiteId, req.shopCustomer!.id),
      });
    } catch (error) {
      next(error);
    }
  };

  createAddress = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({
        addresses: await shopAuthService.createAddress(req.params.websiteId, req.shopCustomer!.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  updateAddress = async (req: Request<WebsiteParams & { addressId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopAuthService.updateAddress(
          req.params.websiteId,
          req.shopCustomer!.id,
          req.params.addressId,
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteAddress = async (req: Request<WebsiteParams & { addressId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopAuthService.deleteAddress(req.params.websiteId, req.shopCustomer!.id, req.params.addressId),
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopAuthService.changePassword(req.params.websiteId, req.shopCustomer!.id, req.body.currentPassword, req.body.newPassword);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopAuthService.requestPasswordReset(req.params.websiteId, req.body.email);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.resetPassword(req.params.websiteId, req.body.token, req.body.password));
    } catch (error) {
      next(error);
    }
  };

  listCart = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopAuthService.listCart(req.params.websiteId, req.shopCustomer!.id),
      });
    } catch (error) {
      next(error);
    }
  };

  listWishlist = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        wishlistItems: await shopAuthService.listWishlist(req.params.websiteId, req.shopCustomer!.id),
      });
    } catch (error) {
      next(error);
    }
  };

  addToWishlist = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        wishlistItems: await shopAuthService.addToWishlist(req.params.websiteId, req.shopCustomer!.id, req.body.variantId),
      });
    } catch (error) {
      next(error);
    }
  };

  removeFromWishlist = async (
    req: Request<WebsiteParams & { variantId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      res.status(200).json({
        wishlistItems: await shopAuthService.removeFromWishlist(
          req.params.websiteId,
          req.shopCustomer!.id,
          req.params.variantId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  addToCart = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopAuthService.addToCart(req.params.websiteId, req.shopCustomer!.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  updateCartItem = async (req: Request<WebsiteParams & { itemId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopAuthService.updateCartItem(
          req.params.websiteId,
          req.shopCustomer!.id,
          req.params.itemId,
          req.body.quantity,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  removeCartItem = async (req: Request<WebsiteParams & { itemId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopAuthService.removeCartItem(req.params.websiteId, req.shopCustomer!.id, req.params.itemId),
      });
    } catch (error) {
      next(error);
    }
  };

  startCheckout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        checkout: await shopCheckoutService.startCheckout(
          req.params.websiteId,
          req.shopCustomer!.id,
          (req.body ?? {}) as { addressId?: string; couponCode?: string },
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  previewCoupon = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const { shopCouponService } = await import("../services/shop-coupon.service.js");
      res.json({
        preview: await shopCouponService.previewForCustomer(
          req.params.websiteId,
          req.shopCustomer!.id,
          String(req.body?.couponCode ?? ""),
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  confirmCheckout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopCheckoutService.confirmCheckout(req.params.websiteId, req.shopCustomer!.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  getOrder = async (req: Request<WebsiteParams & { orderId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopCheckoutService.getCustomerOrder(req.params.websiteId, req.shopCustomer!.id, req.params.orderId),
      });
    } catch (error) {
      next(error);
    }
  };

  downloadOrderInvoice = async (req: Request<WebsiteParams & { orderId: string }>, res: Response, next: NextFunction) => {
    try {
      const invoice = await shopInvoiceService.renderCustomerInvoice(
        req.params.websiteId,
        req.shopCustomer!.id,
        req.params.orderId,
      );
      const asPdf = String(req.query.format ?? "").toLowerCase() === "pdf";
      if (asPdf) {
        const pdf = await htmlToPdf(invoice.html);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${invoice.filename}"`);
        res.status(200).send(pdf);
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="${invoice.filename.replace(/\.pdf$/i, ".html")}"`);
      res.status(200).send(invoice.html);
    } catch (error) {
      next(error);
    }
  };

  cancelOrder = async (req: Request<WebsiteParams & { orderId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopCheckoutService.cancelCustomerOrder(
          req.params.websiteId,
          req.shopCustomer!.id,
          req.params.orderId,
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  returnOrder = async (req: Request<WebsiteParams & { orderId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopCheckoutService.returnCustomerOrder(
          req.params.websiteId,
          req.shopCustomer!.id,
          req.params.orderId,
          req.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  listGuestCart = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopGuestService.listCart(req.params.websiteId, req.shopGuestSessionId!),
      });
    } catch (error) {
      next(error);
    }
  };

  addGuestCart = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopGuestService.addToCart(req.params.websiteId, req.shopGuestSessionId!, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  updateGuestCartItem = async (req: Request<WebsiteParams & { itemId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopGuestService.updateCartItem(
          req.params.websiteId,
          req.shopGuestSessionId!,
          req.params.itemId,
          req.body.quantity,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  removeGuestCartItem = async (req: Request<WebsiteParams & { itemId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        cartItems: await shopGuestService.removeCartItem(
          req.params.websiteId,
          req.shopGuestSessionId!,
          req.params.itemId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  listGuestAddresses = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopGuestService.listAddresses(req.params.websiteId, req.shopGuestSessionId!),
      });
    } catch (error) {
      next(error);
    }
  };

  saveGuestAddress = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopGuestService.saveAddress(req.params.websiteId, req.shopGuestSessionId!, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteGuestAddress = async (req: Request<WebsiteParams & { addressId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        addresses: await shopGuestService.deleteAddress(
          req.params.websiteId,
          req.shopGuestSessionId!,
          req.params.addressId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  listGuestWishlist = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        wishlistItems: await shopGuestService.listWishlist(req.params.websiteId, req.shopGuestSessionId!),
      });
    } catch (error) {
      next(error);
    }
  };

  addGuestWishlist = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        wishlistItems: await shopGuestService.addToWishlist(
          req.params.websiteId,
          req.shopGuestSessionId!,
          req.body.variantId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  removeGuestWishlist = async (req: Request<WebsiteParams & { variantId: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        wishlistItems: await shopGuestService.removeFromWishlist(
          req.params.websiteId,
          req.shopGuestSessionId!,
          req.params.variantId,
        ),
      });
    } catch (error) {
      next(error);
    }
  };

  startGuestCheckout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        checkout: await shopGuestService.startCheckout(req.params.websiteId, req.shopGuestSessionId!, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  confirmGuestCheckout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopGuestService.confirmCheckout(req.params.websiteId, req.shopGuestSessionId!, req.body),
      });
    } catch (error) {
      next(error);
    }
  };

  trackOrder = async (req: Request<WebsiteParams & { token: string }>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        order: await shopGuestService.getTrackedOrder(req.params.websiteId, req.params.token),
      });
    } catch (error) {
      next(error);
    }
  };

  trackOrderInvoice = async (req: Request<WebsiteParams & { token: string }>, res: Response, next: NextFunction) => {
    try {
      const invoice = await shopGuestService.renderTrackedInvoice(req.params.websiteId, req.params.token);
      const asPdf = String(req.query.format ?? "").toLowerCase() === "pdf";
      if (asPdf) {
        const pdf = await htmlToPdf(invoice.html);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${invoice.filename}"`);
        res.status(200).send(pdf);
        return;
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `inline; filename="${invoice.filename.replace(/\.pdf$/i, ".html")}"`);
      res.status(200).send(invoice.html);
    } catch (error) {
      next(error);
    }
  };
}

export const shopAuthController = new ShopAuthController();
