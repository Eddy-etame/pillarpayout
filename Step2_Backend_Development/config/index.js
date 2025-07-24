const dotenv = require('dotenv');
dotenv.config();

const Joi = require('joi');

const envSchema = Joi.object({
  PORT: Joi.number().default(3001),
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().allow(''),
  POSTGRES_DB: Joi.string().default('pillar_payout'),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  JWT_SECRET: Joi.string().required(),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  port: envVars.PORT,
  postgres: {
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    user: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
    database: envVars.POSTGRES_DB,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
  },
  jwtSecret: envVars.JWT_SECRET,
};

module.exports = config;
