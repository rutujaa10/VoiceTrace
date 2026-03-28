/**
 * Ledger Controller — Enhanced
 *
 * Handles audio/text processing with:
 *  - Phase 1: Entity extraction with ambiguity flags
 *  - Phase 4 Feature 6: Clarification resolution endpoint
 *  - Phase 4 Feature 7: Anomaly detection on entry save
 *  - Phase 4 Feature 8: Word-level timestamps storage
 */

const LedgerEntry = require('../models/LedgerEntry');
const User = require('../models/User');
const Item = require('../models/Item');
const { asyncHandler } = require('../middlewares/errorHandler');
const whisperService = require('../services/whisper.service');
const extractionService = require('../services/extraction.service');
const loanService = require('../services/loan.service');
const anomalyService = require('../services/anomaly.service');

/**
 * POST /api/ledger/:vendorId/audio — Process audio from PWA
 *
 * Enhanced: stores word-level timestamps for audio playback mapping,
 * runs anomaly detection, preserves ambiguity flags from extraction.
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

  // Transcribe (now returns word-level timestamps)
  const transcription = await whisperService.transcribe(req.file.path);

  // Extract entities with word timestamps for audio mapping
  const extraction = await extractionService.extractEntities(
    transcription.text,
    vendor.businessCategory,
    vendor.preferredLanguage,
    transcription.words || [] // Phase 4 Feature 8: pass word timestamps
  );

  if (req.query.save === 'false') {
    return res.status(200).json({
      success: true,
      data: {
        extraction,
        audioUrl: req.file.filename,
        wordTimestamps: transcription.words || [],
        loanReadiness: vendor.loanReadiness,
      },
    });
  }

  // Create/append to today's entry
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let entry = await LedgerEntry.findOne({ vendor: vendor._id, date: { $gte: today } });

  if (entry) {
    entry.items.push(...extraction.items);
    entry.expenses.push(...extraction.expenses);
    entry.missedProfits.push(...extraction.missedProfits);
    entry.rawTranscript += '\n---\n' + transcription.text;
    // Append word timestamps
    if (transcription.words?.length > 0) {
      entry.wordTimestamps = [...(entry.wordTimestamps || []), ...transcription.words];
    }
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
      wordTimestamps: transcription.words || [],
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

  // Phase 4 Feature 7: Run anomaly detection
  const anomaly = await anomalyService.detectAnomaly(vendor._id, entry);
  if (anomaly) {
    entry.anomaly = anomaly;
    await entry.save();
  }

  // Upsert items into the auto-updated catalog
  await Item.upsertFromExtraction(vendor._id, extraction.items, today);

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
      anomaly: anomaly || null,
    },
  });
});

/**
 * POST /api/ledger/:vendorId/text — Process pre-transcribed text (from Web Speech API)
 *
 * Enhanced: supports ambiguity flags, anomaly detection.
 */
const processText = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const { transcript, language } = req.body;
  if (!transcript || transcript.trim().length === 0) {
    const err = new Error('Transcript is required');
    err.statusCode = 400;
    throw err;
  }

  // Extract entities (no word timestamps from Web Speech API, so pass empty array)
  const extraction = await extractionService.extractEntities(
    transcript.trim(),
    vendor.businessCategory,
    language || vendor.preferredLanguage,
    [] // Web Speech API doesn't provide word timestamps
  );

  // Create/append to today's entry
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let entry = await LedgerEntry.findOne({ vendor: vendor._id, date: { $gte: today } });

  if (entry) {
    entry.items.push(...extraction.items);
    entry.expenses.push(...extraction.expenses);
    entry.missedProfits.push(...extraction.missedProfits);
    entry.rawTranscript += '\n---\n' + transcript.trim();
  } else {
    entry = new LedgerEntry({
      vendor: vendor._id,
      date: today,
      rawTranscript: transcript.trim(),
      language: language || vendor.preferredLanguage,
      items: extraction.items,
      expenses: extraction.expenses,
      missedProfits: extraction.missedProfits,
      source: 'web_speech_api',
      location: vendor.location,
      processingMeta: {
        llmModel: extraction.model,
        llmTokensUsed: extraction.tokensUsed,
        processedAt: new Date(),
      },
    });
  }

  await entry.save();

  // Phase 4 Feature 7: Run anomaly detection
  const anomaly = await anomalyService.detectAnomaly(vendor._id, entry);
  if (anomaly) {
    entry.anomaly = anomaly;
    await entry.save();
  }

  // Upsert items into catalog
  await Item.upsertFromExtraction(vendor._id, extraction.items, today);

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
      anomaly: anomaly || null,
    },
  });
});

/**
 * POST /api/ledger/:vendorId/extract-only — Extract entities WITHOUT saving to ledger
 *
 * Used by AI Conversation mode to show data for review before the user confirms.
 */
const extractOnly = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const { transcript, language } = req.body;
  if (!transcript || transcript.trim().length === 0) {
    const err = new Error('Transcript is required');
    err.statusCode = 400;
    throw err;
  }

  // Extract entities only — no ledger save
  const extraction = await extractionService.extractEntities(
    transcript.trim(),
    vendor.businessCategory,
    language || vendor.preferredLanguage,
    []
  );

  res.json({
    success: true,
    data: {
      extraction,
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
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const [entries, total] = await Promise.all([
    LedgerEntry.find(filter)
      .sort({ date: -1 })
      .skip(((page || 1) - 1) * (limit || 10))
      .limit(limit || 10)
      .lean(),
    LedgerEntry.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: entries,
    pagination: {
      page: page || 1,
      limit: limit || 10,
      total,
      pages: Math.ceil(total / (limit || 10)),
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

/**
 * GET /api/ledger/:vendorId/pending-clarifications
 *
 * Phase 4 Feature 6: Returns recent entries with items/expenses that need clarification.
 * Frontend uses this to show a non-intrusive modal on app open.
 */
const getPendingClarifications = asyncHandler(async (req, res) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const entries = await LedgerEntry.find({
    vendor: req.params.vendorId,
    hasPendingClarifications: true,
    date: { $gte: threeDaysAgo },
  })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  // Flatten all items/expenses that need clarification
  const clarifications = [];

  entries.forEach((entry) => {
    (entry.items || []).forEach((item) => {
      if (item.needsConfirmation || item.isApproximate) {
        clarifications.push({
          entryId: entry._id,
          entryDate: entry.date,
          type: 'item',
          itemId: item._id,
          name: item.name,
          currentValue: { quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice },
          confidence: item.confidence,
          isApproximate: item.isApproximate,
          clarificationNeeded: item.clarificationNeeded,
          sourcePhrase: item.audioTimestamp?.sourcePhrase || item.sourcePhrase || null,
        });
      }
    });

    (entry.expenses || []).forEach((exp) => {
      if (exp.needsConfirmation || exp.isApproximate) {
        clarifications.push({
          entryId: entry._id,
          entryDate: entry.date,
          type: 'expense',
          itemId: exp._id,
          name: exp.description || exp.category,
          currentValue: { amount: exp.amount, category: exp.category },
          confidence: exp.confidence,
          isApproximate: exp.isApproximate,
          clarificationNeeded: exp.clarificationNeeded,
          sourcePhrase: exp.audioTimestamp?.sourcePhrase || exp.sourcePhrase || null,
        });
      }
    });
  });

  res.json({ success: true, data: clarifications });
});

/**
 * PUT /api/ledger/entry/:entryId/clarify
 *
 * Phase 4 Feature 6: Resolve a clarification for an item or expense.
 * Body: { itemId, type: 'item'|'expense', resolvedValue: { quantity?, unitPrice?, totalPrice?, amount? } }
 */
const resolveClarification = asyncHandler(async (req, res) => {
  const { itemId, type, resolvedValue, action } = req.body;
  const entry = await LedgerEntry.findById(req.params.entryId);

  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }

  if (type === 'item') {
    const item = entry.items.id(itemId);
    if (!item) {
      const err = new Error('Item not found in entry');
      err.statusCode = 404;
      throw err;
    }

    if (action === 'confirm') {
      // Vendor confirms the AI guess is correct
      item.needsConfirmation = false;
      item.isApproximate = false;
      item.confidence = Math.max(item.confidence, 0.8);
      item.clarificationNeeded = null;
    } else if (action === 'update' && resolvedValue) {
      // Vendor provides corrected values
      item.resolvedValue = resolvedValue;
      if (resolvedValue.quantity != null) item.quantity = resolvedValue.quantity;
      if (resolvedValue.unitPrice != null) item.unitPrice = resolvedValue.unitPrice;
      if (resolvedValue.totalPrice != null) item.totalPrice = resolvedValue.totalPrice;
      item.needsConfirmation = false;
      item.isApproximate = false;
      item.confidence = 1.0;
      item.clarificationNeeded = null;
    }
  } else if (type === 'expense') {
    const expense = entry.expenses.id(itemId);
    if (!expense) {
      const err = new Error('Expense not found in entry');
      err.statusCode = 404;
      throw err;
    }

    if (action === 'confirm') {
      expense.needsConfirmation = false;
      expense.isApproximate = false;
      expense.confidence = Math.max(expense.confidence, 0.8);
      expense.clarificationNeeded = null;
    } else if (action === 'update' && resolvedValue) {
      expense.resolvedValue = resolvedValue;
      if (resolvedValue.amount != null) expense.amount = resolvedValue.amount;
      if (resolvedValue.category) expense.category = resolvedValue.category;
      expense.needsConfirmation = false;
      expense.isApproximate = false;
      expense.confidence = 1.0;
      expense.clarificationNeeded = null;
    }
  }

  await entry.save();

  res.json({ success: true, data: entry });
});

/**
 * Helper: Check if an entry is still within the editable window (36 hours from entry date at 00:00).
 */
const isEditable = (entry) => {
  const entryDate = new Date(entry.date);
  entryDate.setHours(0, 0, 0, 0);
  const cutoff = new Date(entryDate.getTime() + 36 * 60 * 60 * 1000); // 36 hours later
  return new Date() < cutoff;
};

/**
 * DELETE /api/ledger/entry/:entryId/item/:itemId
 * Remove a specific item from a ledger entry.
 * - Blocked after 36 hours from entry date
 * - Auto-deletes the entire entry if no items AND no expenses remain
 */
const removeItem = asyncHandler(async (req, res) => {
  const entry = await LedgerEntry.findById(req.params.entryId);
  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isEditable(entry)) {
    const err = new Error('Edit window expired. Items can only be removed within 36 hours.');
    err.statusCode = 403;
    throw err;
  }

  const item = entry.items.id(req.params.itemId);
  if (!item) {
    const err = new Error('Item not found in entry');
    err.statusCode = 404;
    throw err;
  }

  entry.items.pull(req.params.itemId);

  // Auto-delete entry if completely empty
  if (entry.items.length === 0 && entry.expenses.length === 0 && entry.missedProfits.length === 0) {
    await LedgerEntry.findByIdAndDelete(entry._id);
    return res.json({ success: true, data: null, deleted: true });
  }

  await entry.save();
  res.json({ success: true, data: entry });
});

/**
 * DELETE /api/ledger/entry/:entryId/expense/:expenseId
 * Remove a specific expense from a ledger entry.
 * - Blocked after 36 hours from entry date
 * - Auto-deletes the entire entry if no items AND no expenses remain
 */
const removeExpense = asyncHandler(async (req, res) => {
  const entry = await LedgerEntry.findById(req.params.entryId);
  if (!entry) {
    const err = new Error('Entry not found');
    err.statusCode = 404;
    throw err;
  }

  if (!isEditable(entry)) {
    const err = new Error('Edit window expired. Expenses can only be removed within 36 hours.');
    err.statusCode = 403;
    throw err;
  }

  const expense = entry.expenses.id(req.params.expenseId);
  if (!expense) {
    const err = new Error('Expense not found in entry');
    err.statusCode = 404;
    throw err;
  }

  entry.expenses.pull(req.params.expenseId);

  // Auto-delete entry if completely empty
  if (entry.items.length === 0 && entry.expenses.length === 0 && entry.missedProfits.length === 0) {
    await LedgerEntry.findByIdAndDelete(entry._id);
    return res.json({ success: true, data: null, deleted: true });
  }

  await entry.save();
  res.json({ success: true, data: entry });
});

/**
 * POST /api/ledger/:vendorId/manual — Manual structured entry (no AI)
 * Accepts items[] and expenses[] directly from a typed form.
 */
const manualEntry = asyncHandler(async (req, res) => {
  const vendor = await User.findById(req.params.vendorId);
  if (!vendor) {
    const err = new Error('Vendor not found');
    err.statusCode = 404;
    throw err;
  }

  const { items, expenses, audioUrl, wordTimestamps } = req.body;
  if ((!items || items.length === 0) && (!expenses || expenses.length === 0)) {
    const err = new Error('At least one item or expense is required');
    err.statusCode = 400;
    throw err;
  }

  // Normalize items
  const normalizedItems = (items || []).map(it => ({
    name: it.name,
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unitPrice) || 0,
    totalPrice: Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    confidence: 1.0,
    isApproximate: false,
    needsConfirmation: false,
    audioTimestamp: it.audioTimestamp || undefined, // Keep if passed from review form
  }));

  // Normalize expenses
  const normalizedExpenses = (expenses || []).map(exp => ({
    category: exp.category || 'raw_material',
    description: exp.description,
    amount: Number(exp.amount) || 0,
    confidence: 1.0,
    isApproximate: false,
    needsConfirmation: false,
    audioTimestamp: exp.audioTimestamp || undefined, // Keep if passed from review form
  }));

  // Build a human-readable transcript for record-keeping
  const transcript = [
    ...normalizedItems.map(it => `${it.name} x${it.quantity} @ ₹${it.unitPrice} = ₹${it.totalPrice}`),
    ...normalizedExpenses.map(exp => `Expense: ${exp.description || exp.category} = ₹${exp.amount}`),
  ].join(', ');

  // Create/append to today's entry
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let entry = await LedgerEntry.findOne({ vendor: vendor._id, date: { $gte: today } });

  if (entry) {
    entry.items.push(...normalizedItems);
    entry.expenses.push(...normalizedExpenses);
    entry.rawTranscript += '\n---\n[Manual Entry] ' + transcript;
    if (wordTimestamps?.length > 0) {
      entry.wordTimestamps = [...(entry.wordTimestamps || []), ...wordTimestamps];
    }
  } else {
    entry = new LedgerEntry({
      vendor: vendor._id,
      date: today,
      rawTranscript: '[Manual Entry] ' + transcript,
      language: vendor.preferredLanguage || 'en',
      items: normalizedItems,
      expenses: normalizedExpenses,
      missedProfits: [],
      audioUrl: audioUrl || null,
      wordTimestamps: wordTimestamps || [],
      source: 'manual',
      confirmedByVendor: true,
      location: vendor.location,
      processingMeta: {
        llmModel: 'manual',
        llmTokensUsed: 0,
        processedAt: new Date(),
      },
    });
  }

  await entry.save();

  // Upsert items into catalog
  await Item.upsertFromExtraction(vendor._id, normalizedItems, today);

  // Update loan score
  vendor.updateStreak(today);
  await loanService.recalculateScore(vendor);
  await vendor.save();

  res.status(201).json({
    success: true,
    data: {
      entry,
      extraction: { items: normalizedItems, expenses: normalizedExpenses, missedProfits: [] },
      loanReadiness: vendor.loanReadiness,
    },
  });
});

module.exports = {
  processAudio,
  processText,
  extractOnly,
  getEntries,
  getSummary,
  confirmEntry,
  getTodayEntry,
  getPendingClarifications,
  resolveClarification,
  removeItem,
  removeExpense,
  manualEntry,
};
