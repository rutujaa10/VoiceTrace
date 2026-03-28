/**
 * Analytics Service — Advanced Weekly Pattern Detection
 *
 * Queries the last 7 days of ledger data for a vendor and produces:
 *   1. Best-selling item (by total quantity)
 *   2. Highest revenue day of the week
 *   3. Total missed profits
 */

const LedgerEntry = require('../models/LedgerEntry');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get weekly analytics for a vendor.
 *
 * @param {ObjectId|string} vendorId
 * @returns {{ bestSeller, peakDay, missedProfits, dailyBreakdown, summary }}
 */
const getWeeklyAnalytics = async (vendorId) => {
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

  // Compute avg price and convert set to count
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

  return {
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
};

module.exports = { getWeeklyAnalytics };
