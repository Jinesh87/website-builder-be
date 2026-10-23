import Joi from "joi";
import { TEMPLATE_CATEGORY_NAME_MAX } from "../services/template-category-rules.js";

export const templateCategoryIdParamsSchema = Joi.object({
  categoryId: Joi.string().guid().required(),
});

export const templateCategoryInputSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(TEMPLATE_CATEGORY_NAME_MAX)
    .pattern(/[\p{L}\p{N}]/u)
    .required()
    .messages({
      "string.empty": "Enter a category name",
      "string.min": "Use at least 2 characters",
      "string.max": `Use at most ${TEMPLATE_CATEGORY_NAME_MAX} characters`,
      "string.pattern.base": "Use at least one letter or number",
    }),
});

export const deleteTemplateCategoryQuerySchema = Joi.object({
  moveTo: Joi.string().guid().optional(),
});
