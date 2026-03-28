/**
 * Assistant Controller — AI Voice Assistant Chat Endpoint
 *
 * Provides a conversational interface for vendors to ask questions
 * about their business data. Re-uses extractionService.answerQuery
 * with 7-day ledger context.
 */

const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const { asyncHandler } = require('../middlewares/errorHandler');
const extractionService = require('../services/extraction.service');

/**
 * POST /api/assistant/chat
 * Body: { vendorId, message }
 * Returns: { success, data: { reply, tokensUsed } }
 */
const chat = asyncHandler(async (req, res) => {
  const { vendorId, message } = req.body;

  if (!vendorId || !message || !message.trim()) {
    const err = new Error('vendorId and message are required.');
    err.statusCode = 400;
    throw err;
  }

  const vendor = await User.findById(vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  // Fetch last 7 days of ledger data for context
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const [entries, summary] = await Promise.all([
    LedgerEntry.find({
      vendor: vendor._id,
      date: { $gte: weekAgo },
    }).sort({ date: -1 }).lean(),
    LedgerEntry.getVendorSummary(vendor._id, 7),
  ]);

  const vendorContext = {
    name: vendor.displayName || vendor.name || 'Vendor',
    category: vendor.businessCategory,
    language: vendor.preferredLanguage,
    loanScore: vendor.loanReadiness?.score || 0,
    streak: vendor.loanReadiness?.streak || 0,
  };

  const { answer, tokensUsed } = await extractionService.answerQuery(
    message.trim(),
    vendorContext,
    { entries, summary }
  );

  res.json({
    success: true,
    data: {
      reply: answer,
      tokensUsed,
    },
  });
});

module.exports = { chat };
