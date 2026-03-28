/**
 * Insight Controller
 */

const Insight = require('../models/Insight');
const { asyncHandler } = require('../middlewares/errorHandler');
const { generateSmartInsights } = require('../services/smartInsights.service');
const weatherService = require('../services/weather.service');

/**
 * GET /api/insights/:vendorId
 */
const getInsights = asyncHandler(async (req, res) => {
  const { type, limit = 20 } = req.query;
  const filter = { vendor: req.params.vendorId };
  if (type) filter.type = type;

  const insights = await Insight.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  res.json({ success: true, data: insights });
});

/**
 * GET /api/insights/:vendorId/smart
 * Real-time AI insights that work from Day 1
 */
const getSmartInsights = asyncHandler(async (req, res) => {
  const result = await generateSmartInsights(req.params.vendorId);
  res.json({ success: true, data: result });
});

/**
 * GET /api/insights/weather/forecast?lat=X&lng=Y
 * Direct weather forecast endpoint for frontend geolocation
 */
const getWeatherForecast = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const latitude = parseFloat(lat) || 19.076;
  const longitude = parseFloat(lng) || 72.8777;

  const weather = await weatherService.getWeatherForecast(latitude, longitude);
  res.json({ success: true, data: weather });
});

/**
 * GET /api/insights/:vendorId/unread
 */
const getUnread = asyncHandler(async (req, res) => {
  const insights = await Insight.getUnreadForVendor(req.params.vendorId);
  res.json({ success: true, data: insights });
});

/**
 * GET /api/insights/:vendorId/weekly-story
 */
const getWeeklyStory = asyncHandler(async (req, res) => {
  const story = await Insight.getWeeklyStory(req.params.vendorId);
  res.json({ success: true, data: story });
});

/**
 * GET /api/insights/csi/area?lat=X&lng=Y&radius=Z
 */
const getAreaCSI = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 2000 } = req.query;

  if (!lat || !lng) {
    const err = new Error('lat and lng query parameters are required');
    err.statusCode = 400;
    throw err;
  }

  const insights = await Insight.getCSIForArea(
    parseFloat(lng),
    parseFloat(lat),
    parseInt(radius, 10)
  );

  res.json({ success: true, data: insights });
});

/**
 * PUT /api/insights/:insightId/read
 */
const markRead = asyncHandler(async (req, res) => {
  const insight = await Insight.findByIdAndUpdate(
    req.params.insightId,
    { isRead: true },
    { new: true }
  );

  if (!insight) {
    const err = new Error('Insight not found');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, data: insight });
});

module.exports = { getInsights, getSmartInsights, getWeatherForecast, getUnread, getWeeklyStory, getAreaCSI, markRead };

