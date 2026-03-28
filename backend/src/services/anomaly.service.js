/**
 * Anomaly Detection Service
 *
 * Phase 4 Feature 7: Detects if today's earnings/expenses are significantly
 * outside the usual range using a 14-day rolling average + standard deviation.
 *
 * Returns a gentle, single-line alert for the vendor.
 */

const LedgerEntry = require('../models/LedgerEntry');
const mongoose = require('mongoose');

/**
 * Check for anomalies in today's entry against the 14-day baseline.
 *
 * Uses z-score: if |value - mean| > 1.5 * stddev, it's an anomaly.
 *
 * @param {string} vendorId
 * @param {Object} todayEntry - the current day's ledger entry
 * @returns {Object|null} - { detected, type, message, severity } or null
 */
const detectAnomaly = async (vendorId, todayEntry) => {
  // Need today's data to compare
  if (!todayEntry || (todayEntry.totalRevenue === 0 && todayEntry.totalExpenses === 0)) {
    return null;
  }

  // Fetch last 14 days of data (excluding today)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = await LedgerEntry.aggregate([
    {
      $match: {
        vendor: new mongoose.Types.ObjectId(vendorId),
        date: { $gte: fourteenDaysAgo, $lt: today },
      },
    },
    {
      $group: {
        _id: null,
        avgRevenue: { $avg: '$totalRevenue' },
        stdRevenue: { $stdDevPop: '$totalRevenue' },
        avgExpenses: { $avg: '$totalExpenses' },
        stdExpenses: { $stdDevPop: '$totalExpenses' },
        entryCount: { $sum: 1 },
      },
    },
  ]);

  // Need at least 4 days of baseline data for meaningful comparison
  if (!stats[0] || stats[0].entryCount < 4) {
    return null;
  }

  const { avgRevenue, stdRevenue, avgExpenses, stdExpenses } = stats[0];

  // Z-score threshold: 1.5 standard deviations from mean
  const Z_THRESHOLD = 1.5;

  // Check revenue anomalies
  if (stdRevenue > 0 && todayEntry.totalRevenue > 0) {
    const revenueZ = (todayEntry.totalRevenue - avgRevenue) / stdRevenue;

    if (revenueZ > Z_THRESHOLD) {
      return {
        detected: true,
        type: 'revenue_high',
        message: `Great day! Today's revenue (₹${todayEntry.totalRevenue}) is ${Math.round((todayEntry.totalRevenue / avgRevenue - 1) * 100)}% above your usual ₹${Math.round(avgRevenue)}. What went well?`,
        severity: 'info',
      };
    }

    if (revenueZ < -Z_THRESHOLD) {
      return {
        detected: true,
        type: 'revenue_low',
        message: `Today's revenue (₹${todayEntry.totalRevenue}) is below your usual ₹${Math.round(avgRevenue)}. Slow day or did you close early?`,
        severity: 'warning',
      };
    }
  }

  // Check expense anomalies
  if (stdExpenses > 0 && todayEntry.totalExpenses > 0) {
    const expenseZ = (todayEntry.totalExpenses - avgExpenses) / stdExpenses;

    if (expenseZ > Z_THRESHOLD) {
      return {
        detected: true,
        type: 'expense_high',
        message: `Today's expenses (₹${todayEntry.totalExpenses}) were ${Math.round((todayEntry.totalExpenses / avgExpenses - 1) * 100)}% more than your usual ₹${Math.round(avgExpenses)}. Did something unusual happen?`,
        severity: 'alert',
      };
    }
  }

  return null;
};

module.exports = { detectAnomaly };
