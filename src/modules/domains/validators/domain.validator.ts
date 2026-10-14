import Joi from "joi";

export const websiteDomainsParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const domainParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  domainId: Joi.string().guid().required(),
});

export const addDomainSchema = Joi.object({
  hostname: Joi.string().trim().min(3).max(300).required(),
});