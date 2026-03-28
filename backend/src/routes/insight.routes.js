/**
 * Insight API Routes
 */

const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insight.controller');

// GET /api/insights/weather/forecast — Weather forecast (must be before :vendorId routes)
router.get('/weather/forecast', insightController.getWeatherForecast);

// GET /api/insights/csi/area — Get CSI for area (query: lat, lng, radius)
router.get('/csi/area', insightController.getAreaCSI);

// GET /api/insights/:vendorId — Get vendor insights
router.get('/:vendorId', insightController.getInsights);

// GET /api/insights/:vendorId/smart — Real-time AI insights (Day-1 ready)
router.get('/:vendorId/smart', insightController.getSmartInsights);

// GET /api/insights/:vendorId/unread — Get unread insights
router.get('/:vendorId/unread', insightController.getUnread);

// GET /api/insights/:vendorId/weekly-story — Get latest weekly story
router.get('/:vendorId/weekly-story', insightController.getWeeklyStory);

// PUT /api/insights/:insightId/read — Mark insight as read
router.put('/:insightId/read', insightController.markRead);

module.exports = router;
