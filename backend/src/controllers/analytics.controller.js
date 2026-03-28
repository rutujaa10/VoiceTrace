/**
 * Analytics Controller
 */

const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const analyticsService = require('../services/analytics.service');

/**
 * GET /api/analytics/weekly/:vendorId — Weekly pattern detection
 */
const getWeekly = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const analytics = await analyticsService.getWeeklyAnalytics(vendor._id);

  res.json({
    success: true,
    data: analytics,
  });
});

module.exports = { getWeekly };
