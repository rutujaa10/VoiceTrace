/**
 * Twilio WhatsApp Webhook Routes
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// POST /api/webhook/whatsapp — Incoming WhatsApp message (Twilio)
router.post('/whatsapp', webhookController.handleWhatsApp);

// POST /api/webhook/whatsapp/status — Message status callback
router.post('/whatsapp/status', webhookController.handleStatusCallback);

module.exports = router;
