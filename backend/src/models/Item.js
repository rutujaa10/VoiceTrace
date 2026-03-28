/**
 * Item Model — Auto-Updated Item Catalog
 *
 * Tracks every unique item a vendor has ever sold.
 * Automatically upserted whenever a LedgerEntry is created.
 * Powers: autocomplete suggestions, catalog management, price trend analysis.
 */

const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Lowercase, trimmed, de-duped name (e.g. "samosa", "chai")
    nameNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // Human-readable display name (preserves original casing from first occurrence)
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    // Auto-classified category
    category: {
      type: String,
      enum: [
        'food', 'beverage', 'snack', 'sweet', 'fruit', 'vegetable',
        'dairy', 'spice', 'raw_material', 'general', 'other',
      ],
      default: 'other',
    },
    // Running weighted average price
    avgPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Lifetime totals
    totalQuantitySold: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Number of distinct days this item was sold
    frequency: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Last day this item appeared in a LedgerEntry
    lastSoldDate: {
      type: Date,
      default: Date.now,
    },
    // Track per-date to prevent double-counting frequency for same-day appends
    _soldDates: {
      type: [String], // ["2026-03-28", "2026-03-27", ...]
      select: false,  // Hidden from normal queries
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one item per vendor per normalized name
ItemSchema.index({ vendor: 1, nameNormalized: 1 }, { unique: true });

// Fast lookups
ItemSchema.index({ vendor: 1, totalRevenue: -1 }); // Top items by revenue
ItemSchema.index({ vendor: 1, frequency: -1 });     // Most frequently sold
ItemSchema.index({ vendor: 1, lastSoldDate: -1 });  // Recently sold

/**
 * Upsert items from a ledger extraction into the catalog.
 *
 * For each extracted item:
 *   - If new: create with initial values
 *   - If exists: update running totals and recalculate weighted avgPrice
 *
 * Formula for avgPrice recalculation:
 *   newAvgPrice = totalRevenue / totalQuantitySold
 *   (This is exact because we track cumulative totals)
 *
 * @param {ObjectId} vendorId
 * @param {Array} items — Extracted items [{name, quantity, unitPrice, totalPrice}]
 * @param {Date} entryDate — The ledger entry date
 */
ItemSchema.statics.upsertFromExtraction = async function (vendorId, items, entryDate) {
  if (!items || items.length === 0) return;

  const dateKey = entryDate.toISOString().slice(0, 10); // "2026-03-28"
  const ops = [];

  for (const item of items) {
    const nameNormalized = item.name.trim().toLowerCase();
    const quantity = Math.max(0, item.quantity || 0);
    const totalPrice = Math.max(0, item.totalPrice || 0);

    if (!nameNormalized || quantity === 0) continue;

    ops.push({
      updateOne: {
        filter: { vendor: vendorId, nameNormalized },
        update: [
          {
            $set: {
              displayName: {
                // Keep the first-seen display name, don't overwrite
                $cond: {
                  if: { $gt: ['$totalQuantitySold', 0] },
                  then: '$displayName',
                  else: item.name.trim(),
                },
              },
              category: {
                $cond: {
                  if: { $gt: ['$totalQuantitySold', 0] },
                  then: '$category',
                  else: classifyItem(nameNormalized),
                },
              },
              totalQuantitySold: {
                $add: [{ $ifNull: ['$totalQuantitySold', 0] }, quantity],
              },
              totalRevenue: {
                $add: [{ $ifNull: ['$totalRevenue', 0] }, totalPrice],
              },
              // avgPrice = new totalRevenue / new totalQuantitySold
              avgPrice: {
                $cond: {
                  if: {
                    $gt: [
                      { $add: [{ $ifNull: ['$totalQuantitySold', 0] }, quantity] },
                      0,
                    ],
                  },
                  then: {
                    $divide: [
                      { $add: [{ $ifNull: ['$totalRevenue', 0] }, totalPrice] },
                      { $add: [{ $ifNull: ['$totalQuantitySold', 0] }, quantity] },
                    ],
                  },
                  else: 0,
                },
              },
              lastSoldDate: entryDate,
              // Increment frequency only if this date hasn't been counted yet
              frequency: {
                $cond: {
                  if: {
                    $in: [dateKey, { $ifNull: ['$_soldDates', []] }],
                  },
                  then: '$frequency',
                  else: { $add: [{ $ifNull: ['$frequency', 0] }, 1] },
                },
              },
              _soldDates: {
                $cond: {
                  if: {
                    $in: [dateKey, { $ifNull: ['$_soldDates', []] }],
                  },
                  then: '$_soldDates',
                  else: {
                    // Keep only last 90 dates to prevent unbounded growth
                    $slice: [
                      { $concatArrays: [{ $ifNull: ['$_soldDates', []] }, [dateKey]] },
                      -90,
                    ],
                  },
                },
              },
            },
          },
        ],
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await this.bulkWrite(ops, { ordered: false });
  }
};

/**
 * Get a vendor's top items by revenue.
 */
ItemSchema.statics.getTopItems = async function (vendorId, limit = 10) {
  return this.find({ vendor: vendorId })
    .sort({ totalRevenue: -1 })
    .limit(limit)
    .lean();
};

/**
 * Get a vendor's full catalog.
 */
ItemSchema.statics.getCatalog = async function (vendorId) {
  return this.find({ vendor: vendorId })
    .sort({ frequency: -1, totalRevenue: -1 })
    .lean();
};

/**
 * Simple item classification based on common Indian street food/vendor items.
 */
function classifyItem(name) {
  const categories = {
    food: [
      'samosa', 'vada', 'pav', 'paratha', 'roti', 'biryani', 'poha',
      'idli', 'dosa', 'uttapam', 'bhel', 'chaat', 'tikki', 'momos',
      'noodles', 'maggi', 'sandwich', 'burger', 'pizza', 'roll',
      'kachori', 'puri', 'bhatura', 'chole', 'rajma', 'dal',
      'rice', 'pulao', 'egg', 'omelette', 'bread', 'bhutta',
      'corn', 'pakora', 'pakoda', 'bhajiya', 'cutlet',
    ],
    beverage: [
      'chai', 'tea', 'coffee', 'lassi', 'nimbu', 'lemonade', 'sharbat',
      'juice', 'cold drink', 'soda', 'paani', 'water', 'milk', 'doodh',
      'thandai', 'buttermilk', 'chaas', 'sugarcane', 'ganne',
    ],
    snack: [
      'chips', 'kurkure', 'biscuit', 'namkeen', 'mixture', 'sev',
      'peanut', 'mungfali', 'chana', 'makhana', 'popcorn',
    ],
    sweet: [
      'mithai', 'laddu', 'laddoo', 'jalebi', 'gulab jamun', 'barfi',
      'halwa', 'rasgulla', 'kulfi', 'ice cream', 'gola', 'rabdi',
      'kheer', 'imarti', 'peda', 'gajak', 'rewdi',
    ],
    fruit: [
      'apple', 'seb', 'banana', 'kela', 'mango', 'aam', 'papaya',
      'grapes', 'angur', 'orange', 'santra', 'watermelon', 'tarbooz',
      'pomegranate', 'anaar', 'guava', 'amrud', 'coconut', 'nariyal',
      'pineapple', 'strawberry', 'chiku', 'litchi',
    ],
    vegetable: [
      'aloo', 'potato', 'onion', 'pyaz', 'tomato', 'tamatar',
      'gobhi', 'cauliflower', 'palak', 'spinach', 'brinjal', 'baingan',
      'capsicum', 'shimla mirch', 'carrot', 'gajar', 'peas', 'matar',
      'cabbage', 'band gobhi', 'radish', 'mooli', 'beans',
      'lady finger', 'bhindi', 'bitter gourd', 'karela',
    ],
    dairy: [
      'paneer', 'curd', 'dahi', 'ghee', 'butter', 'makhan', 'cream',
      'cheese', 'khoya', 'mawa',
    ],
  };

  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => name.includes(kw))) {
      return cat;
    }
  }
  return 'other';
}

module.exports = mongoose.model('Item', ItemSchema);
