/**
 * Vendor Controller
 */

const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Insight = require('../models/Insight');
const { asyncHandler } = require('../middlewares/errorHandler');
const loanService = require('../services/loan.service');

/**
 * POST /api/vendors/register
 * Register a NEW vendor. Returns error if phone already exists.
 */
const registerVendor = asyncHandler(async (req, res) => {
  const { phone: rawPhone, name, businessCategory, preferredLanguage, latitude, longitude } = req.body;

  // Normalize phone: try multiple formats to find existing user
  // WhatsApp stores as +919876543210, web users enter 9876543210
  const phoneDigits = rawPhone.replace(/\D/g, ''); // strip non-digits
  const possiblePhones = [
    rawPhone,                          // as-is
    phoneDigits,                       // digits only e.g. 9876543210
    `+${phoneDigits}`,                 // +9876543210
    `+91${phoneDigits}`,               // +919876543210
    phoneDigits.replace(/^91/, ''),    // strip leading 91 → 9876543210
    `+91${phoneDigits.replace(/^91/, '')}`, // ensure +91 prefix
  ];
  // De-duplicate
  const uniquePhones = [...new Set(possiblePhones)];

  const existing = await User.findOne({ phone: { $in: uniquePhones } });
  if (existing) {
    const err = new Error('Account already exists with this phone number. Please login instead.');
    err.statusCode = 409;
    throw err;
  }

  // New user: store with +91 prefix for consistency
  const normalizedPhone = phoneDigits.startsWith('91') && phoneDigits.length > 10
    ? `+${phoneDigits}`
    : phoneDigits.length === 10
      ? `+91${phoneDigits}`
      : rawPhone;

  const vendorData = {
    phone: normalizedPhone,
    name: name || '',
    businessCategory: businessCategory || 'general',
    preferredLanguage: preferredLanguage || 'hi',
    onboardedAt: new Date(),
  };

  if (latitude && longitude) {
    vendorData.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  const vendor = await User.create(vendorData);
  res.status(201).json({ success: true, data: vendor, isNew: true });
});

/**
 * POST /api/vendors/login
 * Login existing vendor by phone. Returns 404 if not found.
 */
const loginVendor = asyncHandler(async (req, res) => {
  const { phone: rawPhone } = req.body;

  // Normalize phone to match any stored format
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const possiblePhones = [
    rawPhone,
    phoneDigits,
    `+${phoneDigits}`,
    `+91${phoneDigits}`,
    phoneDigits.replace(/^91/, ''),
    `+91${phoneDigits.replace(/^91/, '')}`,
  ];
  const uniquePhones = [...new Set(possiblePhones)];

  const vendor = await User.findOne({ phone: { $in: uniquePhones } });
  if (!vendor) {
    const err = new Error('No account found with this phone number. Please register first.');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, data: vendor });
});

/**
 * GET /api/vendors/:id
 */
const getVendor = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.id);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: vendor });
});

/**
 * PUT /api/vendors/:id
 */
const updateVendor = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  // Handle location update
  if (updates.latitude && updates.longitude) {
    updates.location = {
      type: 'Point',
      coordinates: [updates.longitude, updates.latitude],
    };
    delete updates.latitude;
    delete updates.longitude;
  }

  const vendor = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  res.json({ success: true, data: vendor });
});

/**
 * GET /api/vendors/:id/loan-score
 */
const getLoanScore = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.id);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  // Recalculate fresh
  await loanService.recalculateScore(vendor);
  await vendor.save();

  res.json({
    success: true,
    data: {
      score: vendor.loanReadiness.score,
      isLoanReady: vendor.loanReadiness.isLoanReady,
      streak: vendor.loanReadiness.streak,
      breakdown: {
        streakScore: Math.min(vendor.loanReadiness.streak / 30, 1) * 40,
        stabilityScore: vendor.loanReadiness.revenueVariance !== null
          ? Math.max(0, 1 - vendor.loanReadiness.revenueVariance) * 25
          : 0,
        revenueScore: Math.min(vendor.loanReadiness.avgDailyRevenue / 5000, 1) * 15,
        expenseScore: (vendor.loanReadiness.expenseConsistency / 100) * 10,
        profileScore: vendor.profileComplete ? 10 : 0,
      },
      threshold: 75,
    },
  });
});

/**
 * GET /api/vendors/:id/dashboard
 */
const getDashboard = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.id);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  // Parallel data fetching
  const [summary, recentEntries, unreadInsights] = await Promise.all([
    LedgerEntry.getVendorSummary(vendor._id, 30),
    LedgerEntry.find({ vendor: vendor._id })
      .sort({ date: -1 })
      .limit(7)
      .lean(),
    Insight.getUnreadForVendor(vendor._id),
  ]);

  res.json({
    success: true,
    data: {
      vendor,
      summary,
      recentEntries,
      unreadInsights,
      loanReadiness: vendor.loanReadiness,
    },
  });
});

module.exports = {
  registerVendor,
  loginVendor,
  getVendor,
  updateVendor,
  getLoanScore,
  getDashboard,
};
