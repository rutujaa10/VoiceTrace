/**
 * Error handling middleware.
 */

const { env } = require('../config/env');

/**
 * 404 handler — catches requests to undefined routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global error handler.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;

  console.error(`[ERROR] ${statusCode} — ${err.message}`);
  if (env.isDev()) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(env.isDev() && { stack: err.stack }),
    },
  });
};

/**
 * Async route wrapper to catch errors.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { notFound, errorHandler, asyncHandler };
