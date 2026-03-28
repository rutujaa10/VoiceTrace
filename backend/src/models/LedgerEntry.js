const mongoose = require('mongoose');

// ============================================
// LedgerEntry Schema — Daily Business Record
// ============================================

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  confidence: {
    type: Number, // 0.0 to 1.0
    default: 1.0,
    min: 0,
    max: 1,
  },
  // Phase 1 & 4: Ambiguity handling & confidence flags
  isApproximate: {
    type: Boolean,
    default: false,
  },
  needsConfirmation: {
    type: Boolean,
    default: false,
  },
  clarificationNeeded: {
    type: String, // e.g., "Quantity unclear — you said 'some bananas'"
    default: null,
  },
  resolvedValue: {
    type: mongoose.Schema.Types.Mixed, // vendor-corrected value
    default: null,
  },
  // Phase 4 Feature 8: Word-level audio mapping
  audioTimestamp: {
    startTime: { type: Number, default: null }, // seconds
    endTime: { type: Number, default: null },   // seconds
    sourcePhrase: { type: String, default: null }, // original spoken words
  },
}, { _id: true });

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      'raw_material',
      'transport',
      'rent',
      'equipment',
      'labor',
      'packaging',
      'other',
    ],
    default: 'other',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  confidence: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1,
  },
  isApproximate: {
    type: Boolean,
    default: false,
  },
  needsConfirmation: {
    type: Boolean,
    default: false,
  },
  clarificationNeeded: {
    type: String,
    default: null,
  },
  resolvedValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  audioTimestamp: {
    startTime: { type: Number, default: null },
    endTime: { type: Number, default: null },
    sourcePhrase: { type: String, default: null },
  },
}, { _id: true });

const missedProfitSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true,
  },
  estimatedLoss: {
    type: Number, // estimated revenue lost in INR
    default: 0,
    min: 0,
  },
  triggerPhrase: {
    type: String, // original phrase that triggered detection
    trim: true,
    default: '',
  },
  confidence: {
    type: Number,
    default: 0.8,
    min: 0,
    max: 1,
  },
}, { _id: false });

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number],
    required: true,
  },
}, { _id: false });

const ledgerEntrySchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  rawTranscript: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    enum: ['hi', 'en', 'hinglish', 'unknown'],
    default: 'unknown',
  },
  items: {
    type: [itemSchema],
    default: [],
  },
  expenses: {
    type: [expenseSchema],
    default: [],
  },
  missedProfits: {
    type: [missedProfitSchema],
    default: [],
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0,
  },
  netProfit: {
    type: Number,
    default: 0,
  },
  confirmedByVendor: {
    type: Boolean,
    default: false,
  },
  audioUrl: {
    type: String, // path to stored audio file
    default: null,
  },
  // Phase 4 Feature 8: Store word-level timestamps from transcription
  wordTimestamps: [{
    word: String,
    start: Number,  // seconds
    end: Number,    // seconds
  }],
  location: {
    type: locationSchema,
    default: null,
  },
  // Phase 4 Feature 7: Anomaly detection flags
  anomaly: {
    detected: { type: Boolean, default: false },
    type: { type: String, enum: ['revenue_high', 'revenue_low', 'expense_high', 'expense_low', null], default: null },
    message: { type: String, default: null },
    severity: { type: String, enum: ['info', 'warning', 'alert', null], default: null },
  },
  // Phase 4 Feature 6: Overall entry clarification status
  hasPendingClarifications: {
    type: Boolean,
    default: false,
  },
  processingMeta: {
    whisperDuration: Number,   // ms taken by Whisper
    llmModel: String,          // model used for extraction
    llmTokensUsed: Number,
    processedAt: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ---- Indexes ----
ledgerEntrySchema.index({ vendor: 1, date: -1 });
ledgerEntrySchema.index({ location: '2dsphere' });
ledgerEntrySchema.index({ date: -1, 'items.name': 1 }); // for CSI item queries

// ---- Pre-save: compute totals + clarification status ----
ledgerEntrySchema.pre('save', function (next) {
  this.totalRevenue = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  this.totalExpenses = this.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  this.netProfit = this.totalRevenue - this.totalExpenses;

  // Phase 4: Auto-compute pending clarifications flag
  const itemNeedsClarification = this.items.some(i => i.needsConfirmation || i.isApproximate);
  const expenseNeedsClarification = this.expenses.some(e => e.needsConfirmation || e.isApproximate);
  this.hasPendingClarifications = itemNeedsClarification || expenseNeedsClarification;

  next();
});

// ---- Virtuals ----
ledgerEntrySchema.virtual('hasLowConfidence').get(function () {
  const lowItems = this.items.some(i => i.confidence < 0.7);
  const lowExpenses = this.expenses.some(e => e.confidence < 0.7);
  return lowItems || lowExpenses;
});

ledgerEntrySchema.virtual('totalMissedRevenue').get(function () {
  return this.missedProfits.reduce((sum, mp) => sum + (mp.estimatedLoss || 0), 0);
});

// ---- Statics ----
ledgerEntrySchema.statics.getVendorSummary = async function (vendorId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await this.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        date: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalRevenue' },
        totalExpenses: { $sum: '$totalExpenses' },
        totalProfit: { $sum: '$netProfit' },
        totalMissedRevenue: {
          $sum: {
            $reduce: {
              input: '$missedProfits',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.estimatedLoss'] },
            },
          },
        },
        entryCount: { $sum: 1 },
        avgDailyRevenue: { $avg: '$totalRevenue' },
        revenueStdDev: { $stdDevPop: '$totalRevenue' },
      },
    },
  ]);

  return result[0] || {
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    totalMissedRevenue: 0,
    entryCount: 0,
    avgDailyRevenue: 0,
    revenueStdDev: 0,
  };
};

// CSI: Find what items sold well in an area today
ledgerEntrySchema.statics.getAreaTrends = async function (lng, lat, radiusMeters = 2000, date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusMeters,
          },
        },
        date: { $gte: dayStart, $lte: dayEnd },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        totalSold: { $sum: '$items.quantity' },
        avgPrice: { $avg: '$items.unitPrice' },
        vendorCount: { $addToSet: '$vendor' },
      },
    },
    {
      $project: {
        item: '$_id',
        totalSold: 1,
        avgPrice: { $round: ['$avgPrice', 2] },
        vendorCount: { $size: '$vendorCount' },
      },
    },
    { $sort: { vendorCount: -1, totalSold: -1 } },
    { $limit: 10 },
  ]);
};

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);

module.exports = LedgerEntry;
