/**
 * Analytics API Routes
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

// GET /api/analytics/weekly/:vendorId — Weekly pattern detection
router.get('/weekly/:vendorId', analyticsController.getWeekly);

module.exports = router;
