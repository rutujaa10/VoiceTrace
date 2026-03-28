/**
 * Assistant API Routes
 */

const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');

// POST /api/assistant/chat — AI chat with business context
router.post('/chat', assistantController.chat);

module.exports = router;
