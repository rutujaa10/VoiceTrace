/**
 * Validation middleware using Joi.
 */

const Joi = require('joi');

/**
 * Creates a validation middleware for a given Joi schema.
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      const err = new Error(`Validation Error: ${messages}`);
      err.statusCode = 400;
      return next(err);
    }

    req[source] = value;
    next();
  };
};

// ---- Common Schemas ----

const vendorSchemas = {
  register: Joi.object({
    phone: Joi.string().pattern(/^[+]?[0-9]{10,15}$/).required()
      .messages({ 'string.pattern.base': 'Phone must be 10-15 digits' }),
    name: Joi.string().trim().max(100).optional(),
    businessCategory: Joi.string().valid(
      'fruits', 'vegetables', 'snacks', 'beverages',
      'street_food', 'sweets', 'dairy', 'flowers', 'general', 'other'
    ).optional(),
    preferredLanguage: Joi.string().valid('hi', 'en', 'hinglish').optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }),

  update: Joi.object({
    name: Joi.string().trim().max(100).optional(),
    businessCategory: Joi.string().valid(
      'fruits', 'vegetables', 'snacks', 'beverages',
      'street_food', 'sweets', 'dairy', 'flowers', 'general', 'other'
    ).optional(),
    preferredLanguage: Joi.string().valid('hi', 'en', 'hinglish').optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    aadhaarLinked: Joi.boolean().optional(),
  }),
};

const ledgerSchemas = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  confirm: Joi.object({
    confirmed: Joi.boolean().required(),
  }),
};

module.exports = { validate, vendorSchemas, ledgerSchemas };
