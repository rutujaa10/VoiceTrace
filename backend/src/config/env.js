require('dotenv').config();

/**
 * Centralized environment configuration with validation.
 */
const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/voicetrace',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',

  // OpenWeatherMap
  OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Storage
  STORAGE_PATH: process.env.STORAGE_PATH || './storage',
  MAX_AUDIO_DURATION_SECONDS: parseInt(process.env.MAX_AUDIO_DURATION_SECONDS, 10) || 180,

  // Feature flags
  isDev: () => env.NODE_ENV === 'development',
  isProd: () => env.NODE_ENV === 'production',
  isTest: () => env.NODE_ENV === 'test',
};

/**
 * Validate required environment variables.
 */
const validateEnv = () => {
  const required = ['MONGODB_URI'];
  const warnings = ['OPENAI_API_KEY', 'TWILIO_ACCOUNT_SID', 'OPENWEATHERMAP_API_KEY'];

  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const missingWarnings = warnings.filter((key) => !env[key]);
  if (missingWarnings.length > 0) {
    console.warn(`[ENV] Warning: Missing optional keys (some features disabled): ${missingWarnings.join(', ')}`);
  }
};

module.exports = { env, validateEnv };
