import Joi from "joi";
import { ContactInquiryStatus } from "../../common/constants/contact.js";

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

export const listEnquiriesQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  status: Joi.string()
    .valid(...Object.values(ContactInquiryStatus))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

export const enquiryIdParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const updateEnquirySchema = Joi.object({
  status: Joi.string().valid(...Object.values(ContactInquiryStatus)),
  read: Joi.boolean(),
})
  .or("status", "read")
  .messages({ "object.missing": "Send a status or a read flag." });

export const enquiryReplySchema = Joi.object({
  subject: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Add a subject.",
    "any.required": "Add a subject.",
  }),
  message: Joi.string().trim().min(1).max(5000).required().messages({
    "string.empty": "Write your reply first.",
    "any.required": "Write your reply first.",
    "string.max": "Replies can be up to 5000 characters.",
  }),
});

export const addEnquiryNoteSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required().messages({
    "string.empty": "Write a note first.",
    "any.required": "Write a note first.",
    "string.max": "Notes can be up to 2000 characters.",
  }),
});
