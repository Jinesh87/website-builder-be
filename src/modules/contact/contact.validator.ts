import Joi from "joi";

export const contactInquirySchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required().messages({
    "string.empty": "Please enter your name.",
    "any.required": "Please enter your name.",
  }),
  email: Joi.string().trim().email().max(255).required().messages({
    "string.email": "Please enter a valid email address.",
    "string.empty": "Please enter your email address.",
    "any.required": "Please enter your email address.",
  }),
  phone: Joi.string().trim().max(50).allow("", null).optional(),
  subject: Joi.string().trim().max(200).allow("", null).optional().default("General question"),
  message: Joi.string().trim().min(10).max(5000).required().messages({
    "string.min": "Please write at least 10 characters so we can help.",
    "string.empty": "Please enter your message.",
    "any.required": "Please enter your message.",
  }),
});
