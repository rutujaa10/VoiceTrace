/**
 * Smart-Cart Controller — Location Engine + Festive Board
 *
 * Combines the Smart-Cart location/timing recommendations with
 * the Festival calendar and generates actionable vendor advice.
 */

const { asyncHandler } = require('../middlewares/errorHandler');
const { getSmartCartRecommendations } = require('../services/smartCart.service');
const { getUpcomingFestivals } = require('../services/festive.service');

/**
 * GET /api/smartcart/recommendations
 *
 * Query params: lat, lng, category (vendor business category), radius
 * Returns nearby anchor points, peak-time recommendations, and next-day plan.
 */
const getRecommendations = asyncHandler(async (req, res) => {
  const { lat, lng, category, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      success: false,
      error: { message: 'lat and lng query parameters are required' },
    });
  }

  const data = getSmartCartRecommendations(
    parseFloat(lat),
    parseFloat(lng),
    category || 'general',
    parseInt(radius) || 2000
  );

  res.json({ success: true, data });
});

/**
 * GET /api/smartcart/festivals
 *
 * Query params: days (lookahead window, default 7), category
 * Returns upcoming festivals with stock suggestions relevant to vendor's category.
 */
const getFestivals = asyncHandler(async (req, res) => {
  const { days, category } = req.query;

  const data = getUpcomingFestivals(
    parseInt(days) || 7,
    category || 'general'
  );

  res.json({ success: true, data });
});

/**
 * GET /api/smartcart/daily-brief
 *
 * The combined "Active Consultant" daily brief:
 * - Today's location recommendations
 * - Upcoming festivals
 * - Next-day plan
 *
 * Query params: lat, lng, category, radius
 */
const getDailyBrief = asyncHandler(async (req, res) => {
  const { lat, lng, category, radius } = req.query;

  const vendorCategory = category || 'general';

  // Location recommendations (if GPS available)
  let locationData = null;
  if (lat && lng) {
    locationData = getSmartCartRecommendations(
      parseFloat(lat),
      parseFloat(lng),
      vendorCategory,
      parseInt(radius) || 2000
    );
  }

  // Upcoming festivals (always available)
  const festivals = getUpcomingFestivals(7, vendorCategory);

  res.json({
    success: true,
    data: {
      location: locationData,
      festivals,
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = { getRecommendations, getFestivals, getDailyBrief };
