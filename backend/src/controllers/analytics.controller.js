/**
 * Analytics Controller — Enhanced
 *
 * Phase 2: Weekly patterns with LLM insights + stock suggestions
 */

const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const analyticsService = require('../services/analytics.service');

/**
 * GET /api/analytics/weekly/:vendorId — Weekly pattern detection
 *
 * Returns: bestSeller, peakDay, missedProfits, dailyBreakdown,
 *          plainInsights (LLM-generated bullets), stockSuggestions
 */
const getWeekly = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const analytics = await analyticsService.getWeeklyAnalytics(
    vendor._id,
    vendor.preferredLanguage || 'hi'
  );

  res.json({
    success: true,
    data: analytics,
  });
});

module.exports = { getWeekly };
