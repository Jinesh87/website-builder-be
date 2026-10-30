import Joi from "joi";
import {
  BUSINESS_TYPES,
  DOMAIN_OPTIONS,
  FEATURE_OPTIONS,
  LOGO_OPTIONS,
  LOOK_OPTIONS,
  NEEDED_OPTIONS,
  PALETTE_OPTIONS,
  PHOTOS_OPTIONS,
  QuestionnaireStatus,
  STYLE_OPTIONS,
  TEXT_OPTIONS,
  WEBSITE_PAGES,
} from "../../common/constants/questionnaire.js";

const reachMethodSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  differentContact: Joi.string().trim().max(120).allow("", null).optional(),
});

export const questionnaireAnswersSchema = Joi.object({
  businessType: Joi.string()
    .valid(...BUSINESS_TYPES)
    .required()
    .messages({
      "any.only": "Please choose a valid business type.",
      "any.required": "Please select your business type.",
      "string.empty": "Please select your business type.",
    }),
  pages: Joi.array()
    .items(Joi.string().valid(...WEBSITE_PAGES))
    .min(1)
    .required()
    .messages({
      "array.min": "Please select at least one page.",
      "any.required": "Please select pages for your website.",
    }),
  look: Joi.string()
    .valid(...LOOK_OPTIONS)
    .required()
    .messages({
      "any.only": "Please pick a visual look (Light, Dark, or Colourful).",
      "any.required": "Please pick a visual look.",
    }),
  style: Joi.string()
    .valid(...STYLE_OPTIONS)
    .required()
    .messages({
      "any.only": "Please choose a design style.",
      "any.required": "Please choose a design style.",
    }),
  palette: Joi.string()
    .valid(...PALETTE_OPTIONS)
    .required()
    .messages({
      "any.only": "Please choose a colour palette.",
      "any.required": "Please choose a colour palette.",
    }),
  reach: Joi.object({
    call: reachMethodSchema.default({ enabled: false }),
    whatsapp: reachMethodSchema.default({ enabled: false }),
    enquiryForm: reachMethodSchema.default({ enabled: true }),
    mapLocation: reachMethodSchema.default({ enabled: false }),
    socialLinks: Joi.array().items(Joi.string()).default([]),
  }).required(),
  features: Joi.array()
    .items(Joi.string().valid(...FEATURE_OPTIONS))
    .default([]),
  logo: Joi.string()
    .valid(...LOGO_OPTIONS)
    .required()
    .messages({
      "any.only": "Please specify your logo preference.",
      "any.required": "Please specify your logo preference.",
    }),
  text: Joi.string()
    .valid(...TEXT_OPTIONS)
    .required()
    .messages({
      "any.only": "Please specify your website copy preference.",
      "any.required": "Please specify your website copy preference.",
    }),
  photos: Joi.string()
    .valid(...PHOTOS_OPTIONS)
    .required()
    .messages({
      "any.only": "Please specify your photos preference.",
      "any.required": "Please specify your photos preference.",
    }),
  domain: Joi.string()
    .valid(...DOMAIN_OPTIONS)
    .required()
    .messages({
      "any.only": "Please specify your domain status.",
      "any.required": "Please specify your domain status.",
    }),
  needed: Joi.string()
    .valid(...NEEDED_OPTIONS)
    .required()
    .messages({
      "any.only": "Please specify how soon you need the website.",
      "any.required": "Please specify how soon you need the website.",
    }),
}).options({ stripUnknown: true });

export const submitQuestionnaireSchema = Joi.object({
  businessName: Joi.string().trim().min(1).max(160).required().messages({
    "string.empty": "Please enter your business or website name.",
    "any.required": "Please enter your business or website name.",
  }),
  name: Joi.string().trim().min(1).max(120).required().messages({
    "string.empty": "Please enter your contact name.",
    "any.required": "Please enter your contact name.",
  }),
  phone: Joi.string().trim().min(5).max(50).required().messages({
    "string.empty": "Please enter your phone/mobile number.",
    "any.required": "Please enter your phone/mobile number.",
  }),
  email: Joi.string().trim().email().max(255).required().messages({
    "string.email": "Please enter a valid email address.",
    "string.empty": "Please enter your email address.",
    "any.required": "Please enter your email address.",
  }),
  answers: questionnaireAnswersSchema.required(),
  filesLink: Joi.string().trim().max(1000).allow("", null).optional(),
  notes: Joi.string().trim().max(5000).allow("", null).optional(),
  ref: Joi.string().trim().max(100).allow("", null).optional(),
  website: Joi.string().allow("", null).optional(), // Honeypot
}).options({ stripUnknown: true });

export const listQuestionnairesQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  status: Joi.string()
    .valid(...Object.values(QuestionnaireStatus))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

export const questionnaireIdParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const updateQuestionnaireSchema = Joi.object({
  status: Joi.string().valid(...Object.values(QuestionnaireStatus)),
  read: Joi.boolean(),
  clientId: Joi.string().guid().allow(null),
  websiteId: Joi.string().guid().allow(null),
})
  .or("status", "read", "clientId", "websiteId")
  .messages({ "object.missing": "Send at least one field to update." });

export const addQuestionnaireNoteSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required().messages({
    "string.empty": "Write a note first.",
    "any.required": "Write a note first.",
    "string.max": "Notes can be up to 2000 characters.",
  }),
});

