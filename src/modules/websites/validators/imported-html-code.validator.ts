import Joi from "joi";

/** Body of POST /websites/:id/imported-html/rebuild (the editor's "Edit code" panel). */
export const rebuildImportedHtmlSchema = Joi.object({
  html: Joi.string().max(2_000_000).allow("").required(),
  css: Joi.string().max(1_000_000).allow("").optional(),
  scope: Joi.string().max(64).allow("").optional(),
  texts: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().max(64).required(),
        label: Joi.string().max(120).required(),
        value: Joi.string().max(20_000).allow("").required(),
      }),
    )
    .max(500)
    .optional(),
});
