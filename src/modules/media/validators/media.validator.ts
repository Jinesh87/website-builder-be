import Joi from "joi";
import { MediaKind } from "../../../common/constants/media.js";

const folderName = Joi.string().trim().min(1).max(80);

export const mediaIdParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const folderIdParamsSchema = Joi.object({
  folderId: Joi.string().guid().required(),
});

export const listMediaQuerySchema = Joi.object({
  clientId: Joi.string().guid().optional(),
  websiteId: Joi.string().guid().optional(),
  folderId: Joi.alternatives(Joi.string().guid(), Joi.string().valid("none")).optional(),
  kind: Joi.string()
    .valid(...Object.values(MediaKind))
    .optional(),
  search: Joi.string().trim().max(120).allow("").optional(),
  page: Joi.number().integer().min(1).max(10_000).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(24),
});

/** Multipart text fields that accompany the uploaded file. */
export const uploadMediaSchema = Joi.object({
  clientId: Joi.string().guid().optional(),
  websiteId: Joi.string().guid().optional(),
  folderId: Joi.string().guid().optional(),
  altText: Joi.string().trim().max(300).allow("").optional(),
});

export const MAX_VARIATIONS = 4;

/** Multipart text fields that accompany the source image. */
export const generateVariationsSchema = Joi.object({
  clientId: Joi.string().guid().optional(),
  websiteId: Joi.string().guid().optional(),
  count: Joi.number().integer().min(1).max(MAX_VARIATIONS).required(),
  instructions: Joi.string().trim().max(1000).allow("").optional(),
});

export const updateMediaSchema = Joi.object({
  fileName: Joi.string().trim().min(1).max(255).optional(),
  altText: Joi.string().trim().max(300).allow("", null).optional(),
  folderId: Joi.string().guid().allow(null).optional(),
}).min(1);

export const listFoldersQuerySchema = Joi.object({
  clientId: Joi.string().guid().optional(),
});

export const createFolderSchema = Joi.object({
  name: folderName.required(),
  clientId: Joi.string().guid().optional(),
});

export const updateFolderSchema = Joi.object({
  name: folderName.required(),
});
