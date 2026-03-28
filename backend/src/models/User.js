const mongoose = require('mongoose');

// ============================================
// User Schema — Street Vendor Profile
// ============================================

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function (coords) {
        return coords.length === 2 &&
          coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges.',
    },
  },
}, { _id: false });

const loanReadinessSchema = new mongoose.Schema({
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  streak: {
    type: Number, // consecutive logging days
    default: 0,
  },
  lastLogDate: {
    type: Date,
    default: null,
  },
  revenueVariance: {
    type: Number, // coefficient of variation (lower = more stable)
    default: null,
  },
  avgDailyRevenue: {
    type: Number,
    default: 0,
  },
  expenseConsistency: {
    type: Number, // percentage of days with expense logging
    default: 0,
    min: 0,
    max: 100,
  },
  isLoanReady: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  whatsappId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  businessCategory: {
    type: String,
    enum: [
      'fruits',
      'vegetables',
      'snacks',
      'beverages',
      'street_food',
      'sweets',
      'dairy',
      'flowers',
      'general',
      'other',
    ],
    default: 'general',
  },
  location: {
    type: locationSchema,
    default: null,
  },
  aadhaarLinked: {
    type: Boolean,
    default: false,
  },
  preferredLanguage: {
    type: String,
    enum: ['hi', 'en', 'hinglish'],
    default: 'hi',
  },
  loanReadiness: {
    type: loanReadinessSchema,
    default: () => ({}),
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  onboardedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ---- Indexes ----
userSchema.index({ location: '2dsphere' });
userSchema.index({ businessCategory: 1, isActive: 1 });

// ---- Virtuals ----
userSchema.virtual('profileComplete').get(function () {
  return !!(
    this.name &&
    this.phone &&
    this.businessCategory !== 'general' &&
    this.location &&
    this.aadhaarLinked
  );
});

userSchema.virtual('displayName').get(function () {
  return this.name || `Vendor-${this.phone.slice(-4)}`;
});

// ---- Methods ----
userSchema.methods.updateStreak = function (logDate) {
  const today = new Date(logDate);
  today.setHours(0, 0, 0, 0);

  if (this.loanReadiness.lastLogDate) {
    const lastLog = new Date(this.loanReadiness.lastLogDate);
    lastLog.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      this.loanReadiness.streak += 1;
    } else if (diffDays > 1) {
      this.loanReadiness.streak = 1; // reset
    }
    // diffDays === 0 means same day, no change
  } else {
    this.loanReadiness.streak = 1;
  }

  this.loanReadiness.lastLogDate = today;
};

userSchema.methods.recalculateLoanScore = function () {
  const r = this.loanReadiness;

  // 40% — Consecutive logging days (max at 30 days)
  const streakScore = Math.min(r.streak / 30, 1) * 40;

  // 25% — Revenue stability (lower variance = higher score)
  // Variance of 0 = perfect, > 1 = unstable
  let stabilityScore = 0;
  if (r.revenueVariance !== null) {
    stabilityScore = Math.max(0, 1 - r.revenueVariance) * 25;
  }

  // 15% — Average daily revenue (normalized, cap at ₹5000/day)
  const revenueScore = Math.min(r.avgDailyRevenue / 5000, 1) * 15;

  // 10% — Expense tracking consistency
  const expenseScore = (r.expenseConsistency / 100) * 10;

  // 10% — Profile completeness
  const profileScore = this.profileComplete ? 10 : 0;

  r.score = Math.round(streakScore + stabilityScore + revenueScore + expenseScore + profileScore);
  r.isLoanReady = r.score >= 75;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
