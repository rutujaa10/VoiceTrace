const mongoose = require('mongoose');

// ============================================
// Insight Schema — AI-Generated Business Insights
// ============================================

const weatherContextSchema = new mongoose.Schema({
  temp: Number,         // temperature in Celsius
  condition: String,    // e.g., "rain", "clear", "cloudy"
  humidity: Number,     // percentage
  forecast: String,     // human-readable forecast summary
  icon: String,         // weather icon code
}, { _id: false });

const holidayContextSchema = new mongoose.Schema({
  name: String,         // e.g., "Diwali", "Holi"
  type: {
    type: String,
    enum: ['national', 'regional', 'religious', 'seasonal'],
  },
  expectedImpact: {
    type: String,
    enum: ['high_demand', 'low_demand', 'specific_items', 'closure'],
  },
  affectedItems: [String], // items likely affected
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

const insightSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for area-level CSI insights
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'prediction',       // next-day stock prediction
      'stock_advice',     // specific stock recommendation
      'missed_profit',    // missed profit alert
      'weekly_story',     // Story Mode narrative
      'csi',              // Collective Street Intelligence
      'weather_alert',    // weather-based advisory
      'loan_milestone',   // loan readiness milestone
      'daily_summary',    // daily confirmation summary
    ],
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String, // full narrative text / story
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // structured payload
    default: null,
    // For predictions: { items: [{ name, suggestedQty, reason }] }
    // For CSI: { areaItems: [{ name, demand, vendorCount }] }
    // For missed_profit: { items: [{ name, estimatedLoss }] }
    // For loan_milestone: { previousScore, newScore, milestone }
  },
  weatherContext: {
    type: weatherContextSchema,
    default: null,
  },
  holidayContext: {
    type: holidayContextSchema,
    default: null,
  },
  areaGeo: {
    type: locationSchema,
    default: null,
  },
  areaRadius: {
    type: Number, // radius in meters for CSI
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  sentViaWhatsApp: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null, // auto-expire old predictions
    index: { expires: 0 }, // TTL index
  },
}, {
  timestamps: true,
});

// ---- Indexes ----
insightSchema.index({ vendor: 1, type: 1, createdAt: -1 });
insightSchema.index({ areaGeo: '2dsphere' });
insightSchema.index({ type: 1, createdAt: -1 });

// ---- Statics ----
insightSchema.statics.getUnreadForVendor = function (vendorId) {
  return this.find({
    vendor: vendorId,
    isRead: false,
  })
    .sort({ createdAt: -1 })
    .limit(20);
};

insightSchema.statics.getWeeklyStory = function (vendorId) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return this.findOne({
    vendor: vendorId,
    type: 'weekly_story',
    createdAt: { $gte: oneWeekAgo },
  }).sort({ createdAt: -1 });
};

insightSchema.statics.getCSIForArea = function (lng, lat, radiusMeters = 2000) {
  return this.find({
    type: 'csi',
    areaGeo: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  })
    .sort({ createdAt: -1 })
    .limit(5);
};

const Insight = mongoose.model('Insight', insightSchema);

module.exports = Insight;
