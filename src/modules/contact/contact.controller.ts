import type { Request, Response, NextFunction } from "express";
import { logger } from "../../config/logger.js";
import { emailService } from "../email/services/email.service.js";

const DEFAULT_SALES_EMAIL = "support@bytezoracoders.com";

export class ContactController {
  submitInquiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, subject, message } = req.body;
      const targetEmail = process.env.CONTACT_SALES_EMAIL?.trim() || DEFAULT_SALES_EMAIL;

      logger.info(
        { senderName: name, senderEmail: email, subject, targetEmail },
        "New contact inquiry received from marketing portal",
      );

      let emailDispatched = false;
      try {
        await emailService.sendSalesInquiry({
          to: targetEmail,
          senderName: name,
          senderEmail: email,
          senderPhone: phone || undefined,
          subject: subject || "General question",
          message,
          submittedAt: new Date(),
        });
        emailDispatched = true;
      } catch (err: unknown) {
        const errorRecord = err as { code?: string; message?: string };
        logger.error(
          { err, targetEmail, senderEmail: email, code: errorRecord?.code },
          "Failed to dispatch sales inquiry email",
        );

        // In dev or unconfigured mail states, log the inquiry clearly so no lead is lost
        if (
          errorRecord?.code === "EMAIL_NOT_CONFIGURED" ||
          errorRecord?.code === "EMAIL_DISABLED" ||
          errorRecord?.code === "EMAIL_KEY_UNREADABLE"
        ) {
          logger.warn(
            { targetEmail, senderName: name, senderEmail: email, message },
            "Contact inquiry recorded in system log (email service unconfigured in current environment)",
          );
        } else {
          return next(err);
        }
      }

      return res.status(200).json({
        ok: true,
        message: emailDispatched
          ? "Thank you! Your message has been sent to our sales team."
          : "Thank you! We have received your message.",
        emailDispatched,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const contactController = new ContactController();
