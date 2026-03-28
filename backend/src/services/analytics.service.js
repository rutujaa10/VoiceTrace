/**
 * Analytics Service — Enhanced Weekly Pattern Detection
 *
 * Phase 2 Features:
 *  - Feature 3: Weekly pattern detection with LLM plain-language insights
 *  - Feature 4: Next-day stock suggestions based on sell-through rates
 *
 * Queries the last 7 days of ledger data and produces:
 *   1. Best-selling item (by total quantity)
 *   2. Highest revenue day of the week
 *   3. Total missed profits
 *   4. LLM-generated plain-language observations (2-3 bullets)
 *   5. Next-day stock suggestions
 */

const LedgerEntry = require('../models/LedgerEntry');
const { generateWeeklyInsights, generateStockSuggestions } = require('./extraction.service');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get weekly analytics for a vendor.
 *
 * @param {ObjectId|string} vendorId
 * @param {string} language - vendor's preferred language
 * @returns {{ bestSeller, peakDay, missedProfits, dailyBreakdown, summary, plainInsights, stockSuggestions }}
 */
const getWeeklyAnalytics = async (vendorId, language = 'hi') => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const entries = await LedgerEntry.find({
    vendor: vendorId,
    date: { $gte: weekAgo },
  })
    .sort({ date: 1 })
    .lean();

  // ---- 1. Best-selling item (by total quantity) ----
  const itemMap = {};
  entries.forEach((entry) => {
    (entry.items || []).forEach((item) => {
      const name = item.name?.toLowerCase().trim() || 'unknown';
      if (!itemMap[name]) {
        itemMap[name] = { name, totalQuantity: 0, totalRevenue: 0, avgPrice: 0, daysAppeared: new Set() };
      }
      itemMap[name].totalQuantity += item.quantity || 0;
      itemMap[name].totalRevenue += item.totalPrice || 0;
      itemMap[name].daysAppeared.add(new Date(entry.date).toISOString().slice(0, 10));
    });
  });

  const itemList = Object.values(itemMap).map((it) => ({
    name: it.name,
    totalQuantity: it.totalQuantity,
    totalRevenue: it.totalRevenue,
    avgPrice: it.totalQuantity > 0 ? Math.round(it.totalRevenue / it.totalQuantity) : 0,
    daysAppeared: it.daysAppeared.size,
  }));

  itemList.sort((a, b) => b.totalQuantity - a.totalQuantity);

  const bestSeller = itemList.length > 0 ? itemList[0] : null;

  // ---- 2. Highest revenue day ----
  const dayRevenue = {};
  entries.forEach((entry) => {
    const dayName = WEEKDAY_NAMES[new Date(entry.date).getDay()];
    const dateStr = new Date(entry.date).toISOString().slice(0, 10);

    if (!dayRevenue[dateStr]) {
      dayRevenue[dateStr] = { date: dateStr, dayName, revenue: 0, expenses: 0, profit: 0, itemCount: 0 };
    }
    dayRevenue[dateStr].revenue += entry.totalRevenue || 0;
    dayRevenue[dateStr].expenses += entry.totalExpenses || 0;
    dayRevenue[dateStr].profit += entry.netProfit || 0;
    dayRevenue[dateStr].itemCount += (entry.items || []).length;
  });

  const dailyBreakdown = Object.values(dayRevenue).sort((a, b) => b.revenue - a.revenue);
  const peakDay = dailyBreakdown.length > 0 ? dailyBreakdown[0] : null;

  // ---- 3. Total missed profits ----
  let totalMissedLoss = 0;
  const missedItems = {};

  entries.forEach((entry) => {
    (entry.missedProfits || []).forEach((mp) => {
      const loss = mp.estimatedLoss || 0;
      totalMissedLoss += loss;

      const itemName = mp.item?.toLowerCase().trim() || 'unknown';
      if (!missedItems[itemName]) {
        missedItems[itemName] = { item: itemName, totalLoss: 0, count: 0 };
      }
      missedItems[itemName].totalLoss += loss;
      missedItems[itemName].count += 1;
    });
  });

  const missedProfits = {
    totalLoss: totalMissedLoss,
    topMissedItems: Object.values(missedItems)
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 5),
  };

  // ---- Summary ----
  const totalRevenue = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalExpenses = entries.reduce((s, e) => s + (e.totalExpenses || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);

  const analyticsData = {
    period: { from: weekAgo.toISOString(), to: new Date().toISOString(), days: 7 },
    summary: {
      totalRevenue,
      totalExpenses,
      totalProfit,
      daysLogged: entries.length,
      uniqueItems: itemList.length,
    },
    bestSeller,
    peakDay,
    missedProfits,
    dailyBreakdown,
    topItems: itemList.slice(0, 5),
  };

  // ---- 4. Phase 2 Feature 3: LLM plain-language insights (if ≥4 days data) ----
  let plainInsights = [];
  if (entries.length >= 4) {
    try {
      const insightResult = await generateWeeklyInsights(analyticsData, language);
      plainInsights = insightResult.insights;
    } catch (err) {
      console.error('[Analytics] Failed to generate LLM insights:', err.message);
      plainInsights = ['Keep logging daily — insights get better with more data!'];
    }
  } else {
    plainInsights = [
      `You've logged ${entries.length} days this week. Log ${4 - entries.length} more to unlock weekly insights!`
    ];
  }

  // ---- 5. Phase 2 Feature 4: Next-day stock suggestions ----
  let stockSuggestions = [];
  try {
    stockSuggestions = await generateStockSuggestions(entries, language);
  } catch (err) {
    console.error('[Analytics] Failed to generate stock suggestions:', err.message);
  }

  return {
    ...analyticsData,
    plainInsights,
    stockSuggestions,
  };
};

module.exports = { getWeeklyAnalytics };
