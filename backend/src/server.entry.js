/**
 * VoiceTrace — Express Server Entry Point
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { env, validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// Route imports
const vendorRoutes = require('./routes/vendor.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const insightRoutes = require('./routes/insight.routes');
const webhookRoutes = require('./routes/webhook.routes');
const pdfRoutes = require('./routes/pdf.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const assistantRoutes = require('./routes/assistant.routes');

// Cron jobs
const { initCronJobs } = require('./jobs');

// ---- Initialize ----
validateEnv();

const app = express();

// ---- Middleware ----
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.isDev() ? 'dev' : 'combined'));

// ---- Webhook-specific middleware (MUST come before general body parsers) ----
// Twilio sends form-urlencoded data, not JSON
app.use('/api/webhook', express.urlencoded({ extended: false }));

// Log incoming webhook requests for debugging
app.use('/api/webhook', (req, res, next) => {
  console.log(`[Webhook] ${req.method} ${req.originalUrl}`);
  console.log(`[Webhook] Content-Type: ${req.headers['content-type']}`);
  console.log(`[Webhook] User-Agent: ${req.headers['user-agent']}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[Webhook] Body keys: ${Object.keys(req.body).join(', ')}`);
  }
  next();
});

// General body parsers (for all other routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (audio storage)
app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'VoiceTrace API',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ---- API Routes ----
app.use('/api/vendors', vendorRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assistant', assistantRoutes);

// ---- Error Handling ----
app.use(notFound);
app.use(errorHandler);

// ---- Start Server ----
const startServer = async () => {
  try {
    await connectDB();
    initCronJobs();

    app.listen(env.PORT, () => {
      console.log(`[VoiceTrace] Server running on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`[VoiceTrace] Health: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('[VoiceTrace] Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app; // for testing
