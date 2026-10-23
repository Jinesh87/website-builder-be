import Joi from "joi";

const name = Joi.string().trim().min(2).max(120);
const categoryId = Joi.string().guid().messages({ "string.guid": "Choose a category", "any.required": "Choose a category" });
/** null is accepted because the API returns an unset description as null. */
const description = Joi.string().trim().max(500).allow("", null);
const createdBy = Joi.string().valid("me");
const search = Joi.string().trim().max(120).allow("");

export const templateIdParamsSchema = Joi.object({
  templateId: Joi.string().guid().required(),
});

export const sourceWebsiteParamsSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
});

export const listAdminTemplatesQuerySchema = Joi.object({
  status: Joi.string().valid("live", "hidden", "archived").optional(),
  origin: Joi.string().valid("built-in", "custom").optional(),
  categoryId: categoryId.optional(),
  createdBy: createdBy.optional(),
  search: search.optional(),
});

export const listTemplateDraftsQuerySchema = Joi.object({
  createdBy: createdBy.optional(),
  search: search.optional(),
});

export const createStudioWebsiteSchema = Joi.object({
  name: name.required(),
  startFrom: Joi.string().valid("blank", "template", "website").required(),
  templateKey: Joi.when("startFrom", {
    is: "template",
    then: Joi.string()
      .trim()
      .max(80)
      .pattern(/^[a-z0-9-]+$/)
      .required(),
    otherwise: Joi.forbidden(),
  }),
  websiteId: Joi.when("startFrom", {
    is: "website",
    then: Joi.string().guid().required(),
    otherwise: Joi.forbidden(),
  }),
});

const templateDetails = {
  name: name.required(),
  categoryId: categoryId.required(),
  description: description.optional(),
  isActive: Joi.boolean().default(true),
};

export const createPlatformTemplateSchema = Joi.object({
  websiteId: Joi.string().guid().required(),
  ...templateDetails,
});

export const updatePlatformTemplateSchema = Joi.object(templateDetails);

export const patchPlatformTemplateSchema = Joi.object({
  name: name.optional(),
  categoryId: categoryId.optional(),
  description: description.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);
