const Joi = require('joi');
const { ValidationError } = require('../utils/errors');
const config = require('../config');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return next(new ValidationError('Validation failed', details));
    }
    
    req[property] = value;
    next();
  };
};

const commonSchemas = {
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(8).max(128),
  role: Joi.string().valid(...Object.values(config.roles)),
  asset: Joi.string().valid(...Object.values(config.assets)),
  amount: Joi.number().positive().precision(8),
  address: Joi.string().trim(),
  country: Joi.string().length(2).uppercase(),
  idempotencyKey: Joi.string().uuid(),
};

const authSchemas = {
  register: Joi.object({
    fullName: Joi.string().min(2).max(100).required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'Password confirmation must match password'
    }),
  }),
  
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  
  forgotPassword: Joi.object({
    email: commonSchemas.email.required(),
  }),
  
  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required(),
  }),
};

const walletSchemas = {
  linkWallet: Joi.object({
    address: commonSchemas.address.required(),
    network: Joi.string().valid('hedera', 'ethereum', 'bitcoin').optional(),
    country: commonSchemas.country.optional(),
    signature: Joi.string().optional(),
    message: Joi.string().optional(),
  }),
  
  updateWallet: Joi.object({
    whitelistState: Joi.string().valid(...Object.values(config.walletStatus)).optional(),
    reason: Joi.string().max(500).optional(),
  }),
};

const ledgerSchemas = {
  transfer: Joi.object({
    toAddress: commonSchemas.address.required(),
    amount: commonSchemas.amount.required(),
    asset: commonSchemas.asset.required(),
    description: Joi.string().max(200).optional(),
    idempotencyKey: commonSchemas.idempotencyKey.required(),
  }),
  
  swap: Joi.object({
    fromAsset: commonSchemas.asset.required(),
    toAsset: commonSchemas.asset.required(),
    amount: commonSchemas.amount.required(),
    idempotencyKey: commonSchemas.idempotencyKey.required(),
  }),
};

const paymentSchemas = {
  createIntent: Joi.object({
    amount: commonSchemas.amount.required(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP').default('USD'),
    paymentMethodId: Joi.string().optional(),
  }),
  
  confirmPayment: Joi.object({
    paymentIntentId: Joi.string().required(),
    idempotencyKey: commonSchemas.idempotencyKey.required(),
  }),
};

const proposalSchemas = {
  create: Joi.object({
    type: Joi.string().valid(...Object.values(config.proposalTypes)).required(),
    title: Joi.string().min(10).max(200).required(),
    description: Joi.string().min(50).max(2000).required(),
    payload: Joi.object().required(),
    votingPeriodDays: Joi.number().min(1).max(30).default(7),
  }),
  
  vote: Joi.object({
    choice: Joi.string().valid('FOR', 'AGAINST', 'ABSTAIN').required(),
    reason: Joi.string().max(500).optional(),
  }),
};

const kycSchemas = {
  startSession: Joi.object({
    level: Joi.string().valid('basic', 'full').default('basic'),
    externalUserId: Joi.string().optional(),
  }),
};

module.exports = {
  validate,
  commonSchemas,
  authSchemas,
  walletSchemas,
  ledgerSchemas,
  paymentSchemas,
  proposalSchemas,
  kycSchemas,
};