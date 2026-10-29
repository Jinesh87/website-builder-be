import type { Request, Response, NextFunction } from "express";
import { enquiryService } from "./enquiry.service.js";

export class ContactController {
  submitInquiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { emailDispatched } = await enquiryService.submit(req.body);
      res.status(200).json({
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
