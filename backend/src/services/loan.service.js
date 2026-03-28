/**
 * Loan Readiness Service
 *
 * Recalculates the gamified micro-loan readiness score for a vendor.
 * Scoring: 40% streak + 25% stability + 15% revenue + 10% expenses + 10% profile
 * Threshold: 75/100 for "Loan Ready"
 */

const LedgerEntry = require('../models/LedgerEntry');

/**
 * Recalculate the full loan readiness score for a vendor.
 * Updates vendor.loanReadiness in place (caller must save).
 */
const recalculateScore = async (vendor) => {
  const summary = await LedgerEntry.getVendorSummary(vendor._id, 30);

  // Update revenue stats
  vendor.loanReadiness.avgDailyRevenue = summary.avgDailyRevenue || 0;

  // Revenue variance (coefficient of variation)
  if (summary.avgDailyRevenue > 0 && summary.revenueStdDev !== undefined) {
    vendor.loanReadiness.revenueVariance = summary.revenueStdDev / summary.avgDailyRevenue;
  }

  // Expense tracking consistency
  if (summary.entryCount > 0) {
    const entriesWithExpenses = await LedgerEntry.countDocuments({
      vendor: vendor._id,
      date: { $gte: getDateDaysAgo(30) },
      'expenses.0': { $exists: true },
    });
    vendor.loanReadiness.expenseConsistency =
      Math.round((entriesWithExpenses / summary.entryCount) * 100);
  }

  // Recalculate overall score
  vendor.recalculateLoanScore();
};

const getDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

module.exports = { recalculateScore };
