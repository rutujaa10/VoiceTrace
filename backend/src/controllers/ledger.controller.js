/**
 * Ledger Controller
 */

const LedgerEntry = require('../models/LedgerEntry');
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/errorHandler');
const whisperService = require('../services/whisper.service');
const extractionService = require('../services/extraction.service');
const loanService = require('../services/loan.service');

/**
 * POST /api/ledger/:vendorId/audio — Process audio from PWA
 */
const processAudio = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  if (!req.file) {
    const err = new Error('No audio file uploaded');
    err.statusCode = 400;
    throw err;
  }

  // Transcribe
  const transcription = await whisperService.transcribe(req.file.path);

  // Extract entities
  const extraction = await extractionService.extractEntities(
    transcription.text,
    vendor.businessCategory,
    vendor.preferredLanguage
  );

  // Create/append to today's entry
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let entry = await LedgerEntry.findOne({ vendor: vendor._id, date: { $gte: today } });

  if (entry) {
    entry.items.push(...extraction.items);
    entry.expenses.push(...extraction.expenses);
    entry.missedProfits.push(...extraction.missedProfits);
    entry.rawTranscript += '\n---\n' + transcription.text;
  } else {
    entry = new LedgerEntry({
      vendor: vendor._id,
      date: today,
      rawTranscript: transcription.text,
      language: transcription.language || vendor.preferredLanguage,
      items: extraction.items,
      expenses: extraction.expenses,
      missedProfits: extraction.missedProfits,
      audioUrl: req.file.filename,
      location: vendor.location,
      processingMeta: {
        whisperDuration: transcription.duration,
        llmModel: extraction.model,
        llmTokensUsed: extraction.tokensUsed,
        processedAt: new Date(),
      },
    });
  }

  await entry.save();

  // Update loan score
  vendor.updateStreak(today);
  await loanService.recalculateScore(vendor);
  await vendor.save();

  res.status(201).json({
    success: true,
    data: {
      entry,
      extraction,
      loanReadiness: vendor.loanReadiness,
    },
  });
});

/**
 * GET /api/ledger/:vendorId — Paginated entries
 */
const getEntries = asyncHandler(async (req, res) => {
  const { startDate, endDate, page, limit } = req.query;
  const filter = { vendor: req.params.vendorId };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const [entries, total] = await Promise.all([
    LedgerEntry.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LedgerEntry.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/ledger/:vendorId/summary
 */
const getSummary = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const summary = await LedgerEntry.getVendorSummary(req.params.vendorId, days);
  res.json({ success: true, data: summary });
});

/**
 * PUT /api/ledger/entry/:entryId/confirm
 */
const confirmEntry = asyncHandler(async (req, res) => {
  const entry = await LedgerEntry.findById(req.params.entryId);
  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }

  entry.confirmedByVendor = req.body.confirmed;
  await entry.save();

  res.json({ success: true, data: entry });
});

/**
 * GET /api/ledger/:vendorId/today
 */
const getTodayEntry = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entry = await LedgerEntry.findOne({
    vendor: req.params.vendorId,
    date: { $gte: today },
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: entry });
});

module.exports = { processAudio, getEntries, getSummary, confirmEntry, getTodayEntry };
