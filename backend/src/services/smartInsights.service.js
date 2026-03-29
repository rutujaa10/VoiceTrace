/**
 * Smart Insights Service — Day-1 Ready AI Business Intelligence
 *
 * Generates real-time, on-demand insights that work from Day 1.
 * Insights improve as the vendor logs more business data.
 *
 * Maturity Levels:
 *  - Day 0 (no logs): Weather forecast + getting started tips
 *  - Early (1-3 logs): First revenue analysis + category tips
 *  - Growth (4-7 logs): Trend detection + stock optimization
 *  - Mature (7+ logs): Full AI predictions + growth trajectory
 */

const LedgerEntry = require('../models/LedgerEntry');
const User = require('../models/User');
const weatherService = require('./weather.service');
const { callWithFallback } = require('./extraction.service');
const { env } = require('../config/env');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Determine vendor's data maturity level.
 */
const getMaturityLevel = (entryCount) => {
  if (entryCount === 0) return 'day0';
  if (entryCount <= 3) return 'early';
  if (entryCount <= 7) return 'growth';
  return 'mature';
};

/**
 * Get weather forecast + business advice for vendor's location.
 */
const getWeatherInsight = async (vendor) => {
  let lat = 19.076; // Mumbai default
  let lng = 72.8777;

  if (vendor.location && vendor.location.coordinates) {
    [lng, lat] = vendor.location.coordinates;
  }

  try {
    const weather = await weatherService.getWeatherForecast(lat, lng);
    const forecast = weather.forecast;
    const current = weather.current;

    // Build weather-specific business advice
    const businessAdvice = generateWeatherBusinessAdvice(
      forecast,
      vendor.businessCategory || 'general'
    );

    return {
      type: 'weather_forecast',
      priority: 1,
      icon: getWeatherIcon(forecast.condition),
      title: `Tomorrow's Weather — ${forecast.temp}°C`,
      subtitle: capitalizeFirst(forecast.description || forecast.condition),
      content: businessAdvice.summary,
      data: {
        current: {
          temp: current.temp,
          condition: current.condition,
          humidity: current.humidity,
        },
        forecast: {
          temp: forecast.temp,
          feelsLike: forecast.feelsLike,
          condition: forecast.condition,
          description: forecast.description,
          humidity: forecast.humidity,
          windSpeed: forecast.windSpeed,
          rainProbability: forecast.rainProbability,
          icon: forecast.icon,
        },
        advice: businessAdvice.tips,
        stockAdjustments: businessAdvice.stockAdjustments,
      },
    };
  } catch (err) {
    console.error('[SmartInsights] Weather fetch error:', err.message);
    return {
      type: 'weather_forecast',
      priority: 1,
      icon: '🌤️',
      title: 'Weather Forecast',
      subtitle: 'Could not fetch weather data',
      content: 'Check back later for weather-based stock advice.',
      data: null,
    };
  }
};

/**
 * Generate weather-specific business advice based on category
 */
const generateWeatherBusinessAdvice = (forecast, category) => {
  const tips = [];
  const stockAdjustments = [];
  let summary = '';

  const temp = forecast.temp;
  const condition = forecast.condition?.toLowerCase() || 'clear';
  const rainProb = forecast.rainProbability || 0;
  const humidity = forecast.humidity || 50;

  // Category-specific item mappings
  const categoryItems = {
    fruits: { hot: ['watermelon', 'mango', 'grapes', 'coconut water'], cold: ['banana', 'apple', 'guava'], rain: ['banana', 'apple'] },
    vegetables: { hot: ['cucumber', 'bottle gourd', 'onion'], cold: ['carrot', 'radish', 'spinach'], rain: ['potato', 'onion', 'tomato'] },
    snacks: { hot: ['ice gola', 'cold drinks', 'kulfi'], cold: ['samosa', 'pakora', 'chai'], rain: ['pakora', 'chai', 'maggi'] },
    beverages: { hot: ['lassi', 'nimbu pani', 'cold coffee', 'juice'], cold: ['chai', 'coffee', 'soup'], rain: ['chai', 'coffee', 'soup'] },
    street_food: { hot: ['chaat', 'gola', 'kulfi', 'ice cream'], cold: ['samosa', 'kachori', 'jalebi'], rain: ['pakora', 'bhutta', 'chai'] },
    sweets: { hot: ['rabri', 'kulfi', 'ice cream'], cold: ['gulab jamun', 'gajar halwa', 'jalebi'], rain: ['jalebi', 'samosa', 'pakora'] },
    dairy: { hot: ['lassi', 'buttermilk', 'ice cream', 'curd'], cold: ['hot milk', 'paneer', 'khoya'], rain: ['paneer', 'curd'] },
    flowers: { hot: ['mogra', 'rose'], cold: ['marigold', 'rose'], rain: ['artificial flowers', 'indoor plants'] },
    general: { hot: ['cold drinks', 'water bottles', 'ice'], cold: ['hot beverages', 'snacks'], rain: ['umbrellas', 'hot snacks'] },
  };

  const items = categoryItems[category] || categoryItems.general;

  // Rain scenario
  if (condition === 'rain' || rainProb > 0.5) {
    summary = `🌧️ Rain is expected tomorrow (${Math.round(rainProb * 100)}% chance). Foot traffic may drop — focus on rain-friendly items!`;
    tips.push(`Stock up on: ${items.rain.join(', ')}`);
    tips.push('Reduce perishable stock by 20-30% to avoid waste');
    tips.push('Set up rain cover for your stall if possible');
    if (temp < 25) tips.push('Hot items will sell fast — prepare extra');
    stockAdjustments.push({ action: 'increase', items: items.rain, percentage: 30 });
    stockAdjustments.push({ action: 'decrease', items: items.hot, percentage: 25 });
  }
  // Extreme heat
  else if (temp > 40) {
    summary = `🔥 Extreme heat tomorrow (${temp}°C)! Cold items will fly off the shelves. Stock up and start early before the peak heat.`;
    tips.push(`High demand: ${items.hot.join(', ')}`);
    tips.push('Start selling early morning (6-9 AM) and evening (4-8 PM)');
    tips.push('Keep items fresh with ice/cold storage');
    tips.push('Carry extra water for yourself — stay hydrated!');
    stockAdjustments.push({ action: 'increase', items: items.hot, percentage: 40 });
    stockAdjustments.push({ action: 'decrease', items: items.cold, percentage: 20 });
  }
  // Hot day
  else if (temp > 35) {
    summary = `☀️ Hot day ahead (${temp}°C). Cold and refreshing items will sell well. Consider extending evening hours.`;
    tips.push(`Focus on: ${items.hot.join(', ')}`);
    tips.push('Evening sales usually peak in hot weather');
    tips.push('Keep perishables in shade or ice box');
    stockAdjustments.push({ action: 'increase', items: items.hot, percentage: 20 });
  }
  // Cold day
  else if (temp < 15) {
    summary = `❄️ Cold day tomorrow (${temp}°C). Hot food and warm beverages will be in high demand!`;
    tips.push(`High demand: ${items.cold.join(', ')}`);
    tips.push('Start late morning when people come out');
    tips.push('Keep items warm — invest in thermos/hot plates');
    stockAdjustments.push({ action: 'increase', items: items.cold, percentage: 30 });
    stockAdjustments.push({ action: 'decrease', items: items.hot, percentage: 30 });
  }
  // Pleasant day
  else {
    summary = `🌤️ Pleasant weather tomorrow (${temp}°C). Great conditions for business — expect normal to good footfall!`;
    tips.push('Good weather = good business day!');
    tips.push(`Maintain regular stock of your best sellers`);
    if (new Date().getDay() === 5 || new Date().getDay() === 6) {
      tips.push('Weekend ahead — stock 15-20% extra');
      stockAdjustments.push({ action: 'increase', items: [...items.hot, ...items.cold], percentage: 15 });
    }
  }

  // Humidity factor
  if (humidity > 85 && temp > 28) {
    tips.push('High humidity — cold drinks and lemon water will sell extra');
    stockAdjustments.push({ action: 'increase', items: ['nimbu pani', 'cold drinks', 'lassi'], percentage: 15 });
  }

  return { summary, tips, stockAdjustments };
};

/**
 * Generate getting-started tips for Day-0 users.
 */
const getGettingStartedInsights = (vendor) => {
  const category = vendor.businessCategory || 'general';

  const insights = [
    {
      type: 'getting_started',
      priority: 2,
      icon: '🚀',
      title: 'Welcome to VoiceTrace!',
      subtitle: 'Your AI business partner',
      content: 'Start by recording your first day\'s sales. Just tap the mic and speak naturally — "Aaj 50 samose beche, 10 rupaye mein". I\'ll handle the rest!',
      data: { category, step: 1 },
    },
    {
      type: 'business_tip',
      priority: 3,
      icon: '💡',
      title: 'Did You Know?',
      subtitle: `Tips for ${formatCategory(category)} vendors`,
      content: getCategoryTip(category),
      data: { category },
    },
    {
      type: 'seasonal_tip',
      priority: 4,
      icon: '📅',
      title: 'Seasonal Demand Alert',
      subtitle: getCurrentSeason(),
      content: getSeasonalAdvice(category),
      data: { season: getCurrentSeason(), category },
    },
  ];

  return insights;
};

/**
 * Generate insights for Early stage (1-3 logs).
 */
const getEarlyStageInsights = async (vendor, entries) => {
  const insights = [];
  const totalRevenue = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalExpenses = entries.reduce((s, e) => s + (e.totalExpenses || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);
  const avgRevenue = totalRevenue / entries.length;

  // Revenue analysis
  insights.push({
    type: 'revenue_analysis',
    priority: 2,
    icon: '💰',
    title: `Your Average: ₹${Math.round(avgRevenue).toLocaleString('en-IN')}/day`,
    subtitle: `Based on ${entries.length} day${entries.length > 1 ? 's' : ''} of logging`,
    content: totalProfit >= 0
      ? `Great start! You're earning ₹${Math.round(totalProfit).toLocaleString('en-IN')} profit from ₹${Math.round(totalRevenue).toLocaleString('en-IN')} revenue. Keep logging daily to see trends!`
      : `Your expenses (₹${Math.round(totalExpenses).toLocaleString('en-IN')}) are higher than revenue. Let's work on improving margins!`,
    data: { totalRevenue, totalExpenses, totalProfit, avgRevenue, daysLogged: entries.length },
  });

  // Top items
  const itemMap = {};
  entries.forEach(e => {
    (e.items || []).forEach(item => {
      const name = item.name?.toLowerCase().trim() || 'unknown';
      if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0 };
      itemMap[name].qty += item.quantity || 0;
      itemMap[name].revenue += item.totalPrice || 0;
    });
  });

  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  if (topItems.length > 0) {
    const topItem = topItems[0];
    insights.push({
      type: 'top_items',
      priority: 3,
      icon: '⭐',
      title: `Star Product: ${capitalizeFirst(topItem[0])}`,
      subtitle: `₹${topItem[1].revenue.toLocaleString('en-IN')} revenue from ${topItem[1].qty} units`,
      content: topItems.length > 1
        ? `Your top sellers: ${topItems.map(([n, d]) => `${capitalizeFirst(n)} (₹${d.revenue})`).join(', ')}. Focus on these!`
        : `${capitalizeFirst(topItem[0])} is your only tracked item so far. Log more variety to get better insights!`,
      data: { topItems: topItems.map(([name, data]) => ({ name, ...data })) },
    });
  }

  // Expense ratio
  if (totalExpenses > 0) {
    const expenseRatio = (totalExpenses / totalRevenue * 100).toFixed(1);
    const isHealthy = expenseRatio < 60;
    insights.push({
      type: 'expense_health',
      priority: 4,
      icon: isHealthy ? '✅' : '⚠️',
      title: `Expense Ratio: ${expenseRatio}%`,
      subtitle: isHealthy ? 'Healthy margins!' : 'Expenses are high',
      content: isHealthy
        ? `You're spending ${expenseRatio}% of revenue on expenses. That's a healthy ratio — keep it up!`
        : `You're spending ${expenseRatio}% of revenue on expenses. Try to keep costs under 60% for better profits.`,
      data: { expenseRatio: parseFloat(expenseRatio), isHealthy },
    });
  }

  // Motivation — unlock message
  const daysToGrowth = 4 - entries.length;
  if (daysToGrowth > 0) {
    insights.push({
      type: 'unlock_preview',
      priority: 5,
      icon: '🔓',
      title: `${daysToGrowth} More Days to Unlock Trends!`,
      subtitle: 'Keep logging daily',
      content: `Log ${daysToGrowth} more day${daysToGrowth > 1 ? 's' : ''} to unlock: weekly trend analysis, best-selling day detection, and AI-powered stock suggestions!`,
      data: { daysToUnlock: daysToGrowth, currentDays: entries.length, targetDays: 4 },
    });
  }

  return insights;
};

/**
 * Generate insights for Growth stage (4-7 logs).
 */
const getGrowthStageInsights = async (vendor, entries) => {
  const insights = [];

  // Revenue trend
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const midpoint = Math.floor(sortedEntries.length / 2);
  const firstHalf = sortedEntries.slice(0, midpoint);
  const secondHalf = sortedEntries.slice(midpoint);

  const firstAvg = firstHalf.reduce((s, e) => s + (e.totalRevenue || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, e) => s + (e.totalRevenue || 0), 0) / secondHalf.length;
  const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100).toFixed(1) : 0;
  const isGrowing = secondAvg > firstAvg;

  insights.push({
    type: 'revenue_trend',
    priority: 2,
    icon: isGrowing ? '📈' : '📉',
    title: isGrowing ? `Revenue Growing +${trendPct}%` : `Revenue Dipped ${trendPct}%`,
    subtitle: `Comparing first ${firstHalf.length} days vs last ${secondHalf.length} days`,
    content: isGrowing
      ? `Your revenue is trending up! Average moved from ₹${Math.round(firstAvg)} to ₹${Math.round(secondAvg)} per day. Keep this momentum!`
      : `Revenue dipped slightly. Don't worry — this is normal. Focus on your best-selling items and try new locations.`,
    data: { firstAvg, secondAvg, trendPercentage: parseFloat(trendPct), isGrowing },
  });

  // Best day of week
  const dayRevenue = {};
  entries.forEach(e => {
    const day = WEEKDAY_NAMES[new Date(e.date).getDay()];
    if (!dayRevenue[day]) dayRevenue[day] = { total: 0, count: 0 };
    dayRevenue[day].total += e.totalRevenue || 0;
    dayRevenue[day].count += 1;
  });

  const bestDay = Object.entries(dayRevenue)
    .map(([day, data]) => ({ day, avg: data.total / data.count, total: data.total }))
    .sort((a, b) => b.avg - a.avg)[0];

  if (bestDay) {
    insights.push({
      type: 'best_day',
      priority: 3,
      icon: '🏆',
      title: `Best Day: ${bestDay.day}`,
      subtitle: `Avg ₹${Math.round(bestDay.avg).toLocaleString('en-IN')} revenue`,
      content: `${bestDay.day} is your best performing day! Consider preparing extra stock on ${bestDay.day}s for maximum profit.`,
      data: { bestDay: bestDay.day, avgRevenue: bestDay.avg },
    });
  }

  // Missed profits summary
  let totalMissed = 0;
  const missedItems = {};
  entries.forEach(e => {
    (e.missedProfits || []).forEach(mp => {
      totalMissed += mp.estimatedLoss || 0;
      const name = mp.item?.toLowerCase().trim() || 'unknown';
      if (!missedItems[name]) missedItems[name] = 0;
      missedItems[name] += mp.estimatedLoss || 0;
    });
  });

  if (totalMissed > 0) {
    const topMissed = Object.entries(missedItems).sort((a, b) => b[1] - a[1]).slice(0, 3);
    insights.push({
      type: 'missed_profit_recovery',
      priority: 3,
      icon: '💸',
      title: `Missed ₹${Math.round(totalMissed).toLocaleString('en-IN')} in Profits!`,
      subtitle: 'Items that ran out too early',
      content: `You could have earned ₹${Math.round(totalMissed).toLocaleString('en-IN')} more! Top items that ran out: ${topMissed.map(([n, v]) => `${capitalizeFirst(n)} (₹${Math.round(v)})`).join(', ')}. Stock 20-30% more of these tomorrow.`,
      data: { totalMissed, topMissedItems: topMissed.map(([name, loss]) => ({ name, loss })) },
    });
  }

  // Days to mature unlock
  const daysToMature = Math.max(0, 8 - entries.length);
  if (daysToMature > 0) {
    insights.push({
      type: 'unlock_preview',
      priority: 6,
      icon: '🔮',
      title: `${daysToMature} Days to Full AI Predictions!`,
      subtitle: 'Almost there!',
      content: `Log ${daysToMature} more day${daysToMature > 1 ? 's' : ''} to unlock: week-over-week comparison, profit margin optimization, and AI growth score!`,
      data: { daysToUnlock: daysToMature, currentDays: entries.length, targetDays: 8 },
    });
  }

  return insights;
};

/**
 * Generate insights for Mature stage (7+ logs).
 */
const getMatureStageInsights = async (vendor, entries) => {
  const insights = [];

  const totalRevenue = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalExpenses = entries.reduce((s, e) => s + (e.totalExpenses || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);
  const avgDailyRevenue = totalRevenue / entries.length;
  const avgDailyProfit = totalProfit / entries.length;

  // Week-over-week comparison
  const now = new Date();
  const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);

  const thisWeek = entries.filter(e => new Date(e.date) >= oneWeekAgo);
  const lastWeek = entries.filter(e => new Date(e.date) >= twoWeeksAgo && new Date(e.date) < oneWeekAgo);

  if (thisWeek.length > 0 && lastWeek.length > 0) {
    const thisWeekRev = thisWeek.reduce((s, e) => s + (e.totalRevenue || 0), 0);
    const lastWeekRev = lastWeek.reduce((s, e) => s + (e.totalRevenue || 0), 0);
    const wowPct = lastWeekRev > 0 ? ((thisWeekRev - lastWeekRev) / lastWeekRev * 100).toFixed(1) : 0;
    const isUp = thisWeekRev >= lastWeekRev;

    insights.push({
      type: 'wow_comparison',
      priority: 2,
      icon: isUp ? '🚀' : '📊',
      title: isUp ? `Week-over-Week: +${wowPct}% Growth!` : `Week-over-Week: ${wowPct}%`,
      subtitle: `This week: ₹${Math.round(thisWeekRev).toLocaleString('en-IN')} vs Last week: ₹${Math.round(lastWeekRev).toLocaleString('en-IN')}`,
      content: isUp
        ? `Excellent! Your revenue grew by ${wowPct}% this week. You're on the right track!`
        : `Revenue dipped ${Math.abs(wowPct)}% this week. Review your stock levels and look for items that ran out.`,
      data: { thisWeekRev, lastWeekRev, wowPercentage: parseFloat(wowPct), isUp },
    });
  }

  // Profit margin optimization
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0;
  insights.push({
    type: 'profit_optimization',
    priority: 3,
    icon: profitMargin > 40 ? '🏅' : '📋',
    title: `Profit Margin: ${profitMargin}%`,
    subtitle: `₹${Math.round(avgDailyProfit).toLocaleString('en-IN')} avg daily profit`,
    content: profitMargin > 50
      ? `Outstanding margins! You're keeping more than half of every rupee earned. Your business efficiency is excellent.`
      : profitMargin > 30
        ? `Good margins! Consider negotiating with suppliers or reducing waste to push past 40%.`
        : `Your margins could improve. Focus on: reducing raw material waste, buying in bulk, and pricing competitively.`,
    data: { profitMargin: parseFloat(profitMargin), avgDailyProfit, avgDailyRevenue },
  });

  // Business Growth Score (0-100)
  const growthScore = calculateGrowthScore(entries, vendor);
  insights.push({
    type: 'growth_score',
    priority: 2,
    icon: growthScore >= 70 ? '🌟' : growthScore >= 40 ? '💪' : '🎯',
    title: `Business Growth Score: ${growthScore}/100`,
    subtitle: getGrowthLabel(growthScore),
    content: getGrowthAdvice(growthScore, entries),
    data: { growthScore, factors: getGrowthFactors(entries, vendor) },
  });

  // AI-generated actionable tips (if API available, with 8s timeout)
  try {
    const aiTipsPromise = generateAIGrowthTips(entries, vendor);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI tips timeout')), 8000)
    );
    const aiTips = await Promise.race([aiTipsPromise, timeoutPromise]);
    if (aiTips && aiTips.length > 0) {
      insights.push({
        type: 'ai_growth_tips',
        priority: 3,
        icon: '🧠',
        title: 'AI Growth Recommendations',
        subtitle: 'Personalized advice to grow your business',
        content: aiTips.join('\n\n'),
        data: { tips: aiTips },
      });
    }
  } catch (err) {
    console.error('[SmartInsights] AI tips generation error (fell back to static):', err.message);
    // Fall back to static tips on timeout or error
    const staticTips = getStaticGrowthTips(entries, vendor);
    if (staticTips.length > 0) {
      insights.push({
        type: 'ai_growth_tips',
        priority: 3,
        icon: '🧠',
        title: 'AI Growth Recommendations',
        subtitle: 'Based on your business data',
        content: staticTips.join('\n\n'),
        data: { tips: staticTips },
      });
    }
  }

  // Consistency tracking
  const consistencyScore = Math.round((entries.length / 30) * 100);
  insights.push({
    type: 'consistency',
    priority: 5,
    icon: '🔥',
    title: `Logging Streak: ${vendor.loanReadiness?.streak || 0} Days`,
    subtitle: `${entries.length} entries in last 30 days (${Math.min(consistencyScore, 100)}% consistency)`,
    content: vendor.loanReadiness?.streak >= 7
      ? `Amazing streak! Consistent daily logging builds trust for micro-loans and gives you better predictions.`
      : `Try to log every day — even slow days. Consistent data = better AI predictions = more profits!`,
    data: { streak: vendor.loanReadiness?.streak || 0, totalEntries: entries.length, consistencyScore: Math.min(consistencyScore, 100) },
  });

  return insights;
};

/**
 * Calculate a composite business growth score (0-100).
 */
const calculateGrowthScore = (entries, vendor) => {
  if (entries.length === 0) return 0;

  let score = 0;

  // 1. Consistency (25 points) — how many of the last 30 days have logs
  const consistencyRatio = Math.min(entries.length / 30, 1);
  score += consistencyRatio * 25;

  // 2. Revenue trend (25 points) — is revenue growing?
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length >= 4) {
    const mid = Math.floor(sorted.length / 2);
    const firstAvg = sorted.slice(0, mid).reduce((s, e) => s + (e.totalRevenue || 0), 0) / mid;
    const secondAvg = sorted.slice(mid).reduce((s, e) => s + (e.totalRevenue || 0), 0) / (sorted.length - mid);
    const growth = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
    score += Math.min(Math.max(growth + 0.5, 0), 1) * 25;
  } else {
    score += 12; // partial credit
  }

  // 3. Profit margins (25 points)
  const totalRev = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);
  const margin = totalRev > 0 ? totalProfit / totalRev : 0;
  score += Math.min(Math.max(margin, 0), 0.8) / 0.8 * 25;

  // 4. Diversification (25 points) — how many unique items
  const uniqueItems = new Set();
  entries.forEach(e => (e.items || []).forEach(i => uniqueItems.add(i.name?.toLowerCase().trim())));
  const diversification = Math.min(uniqueItems.size / 10, 1);
  score += diversification * 25;

  return Math.round(Math.min(score, 100));
};

const getGrowthLabel = (score) => {
  if (score >= 80) return '🌟 Thriving Business!';
  if (score >= 60) return '📈 Growing Steadily';
  if (score >= 40) return '💪 Building Momentum';
  if (score >= 20) return '🌱 Getting Started';
  return '🎯 Just Beginning';
};

const getGrowthAdvice = (score, entries) => {
  if (score >= 80) return 'Your business is thriving! Focus on scaling — explore new locations, add popular items, and consider hiring help.';
  if (score >= 60) return 'Solid growth! To reach the next level: reduce waste, optimize your best-selling hours, and stock extra on peak days.';
  if (score >= 40) return 'Good progress! Focus on consistency: log daily, track your expenses carefully, and stock more of what sells.';
  if (score >= 20) return 'You\'re building momentum. Tips: sell at the same time/place daily, note what sells fast, and reduce items that don\'t sell.';
  return 'Welcome aboard! Start by logging daily and paying attention to what your customers ask for most.';
};

const getGrowthFactors = (entries, vendor) => {
  const totalRev = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);
  const uniqueItems = new Set();
  entries.forEach(e => (e.items || []).forEach(i => uniqueItems.add(i.name?.toLowerCase().trim())));

  return {
    consistency: Math.round(Math.min(entries.length / 30, 1) * 100),
    profitMargin: totalRev > 0 ? Math.round(totalProfit / totalRev * 100) : 0,
    diversification: uniqueItems.size,
    streak: vendor.loanReadiness?.streak || 0,
  };
};

/**
 * Use AI to generate personalized growth tips.
 */
const generateAIGrowthTips = async (entries, vendor) => {
  // Check if any AI model is available
  if (!env.AI_API_KEY && !env.GEMINI_API_KEY && !env.GROK_API_KEY) {
    return getStaticGrowthTips(entries, vendor);
  }

  const totalRevenue = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const totalProfit = entries.reduce((s, e) => s + (e.netProfit || 0), 0);
  const itemMap = {};
  entries.forEach(e => {
    (e.items || []).forEach(item => {
      const name = item.name?.toLowerCase().trim() || 'unknown';
      if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0 };
      itemMap[name].qty += item.quantity || 0;
      itemMap[name].revenue += item.totalPrice || 0;
    });
  });

  const topItems = Object.entries(itemMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const category = vendor.businessCategory || 'general';

  const dataStr = `Business: ${formatCategory(category)} vendor
Days logged: ${entries.length}
Total Revenue: ₹${totalRevenue}
Total Profit: ₹${totalProfit}
Profit Margin: ${totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0}%
Top items: ${topItems.map(([n, d]) => `${n} (₹${d.revenue}, ${d.qty} units)`).join(', ')}
Streak: ${vendor.loanReadiness?.streak || 0} days`;

  try {
    const response = await callWithFallback((model) => ({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a business growth advisor for Indian street vendors.
Given the vendor data below, provide EXACTLY 3 specific, actionable growth tips.

RULES:
- Each tip is 1-2 sentences max.
- Be specific with numbers and item names.
- Focus on: revenue optimization, stock management, customer retention, and timing.
- Respond in English.
- Return ONLY a JSON array of 3 strings.
- NO markdown, no code fences.`,
        },
        { role: 'user', content: `VENDOR DATA:\n${dataStr}` },
      ],
      temperature: 0.6,
      max_tokens: 300,
    }));

    const content = response.choices[0].message.content;
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const tips = JSON.parse(jsonStr);
    return Array.isArray(tips) ? tips.slice(0, 3) : [];
  } catch (err) {
    console.error('[SmartInsights] AI tips error:', err.message);
    return getStaticGrowthTips(entries, vendor);
  }
};

/**
 * Fallback static growth tips when AI is unavailable.
 */
const getStaticGrowthTips = (entries, vendor) => {
  const tips = [];
  const totalRevenue = entries.reduce((s, e) => s + (e.totalRevenue || 0), 0);
  const avgRevenue = totalRevenue / entries.length;

  if (avgRevenue < 1000) {
    tips.push('Try selling at busier locations like bus stops or markets to increase daily sales.');
  } else if (avgRevenue < 3000) {
    tips.push('Your daily revenue is good! Consider adding complementary items to boost sales (e.g., drinks with snacks).');
  } else {
    tips.push('Great revenue! Consider hiring a helper to set up a second selling point.');
  }

  const streak = vendor.loanReadiness?.streak || 0;
  if (streak < 7) {
    tips.push('Log daily for 30 consecutive days to qualify for micro-loan programs!');
  } else {
    tips.push(`${streak}-day streak! You're building credibility for micro-loans. Keep going!`);
  }

  tips.push('Track your unsold items — knowing waste patterns can save 10-15% on costs.');

  return tips;
};

// ---- Helpers ----

const getWeatherIcon = (condition) => {
  const map = {
    clear: '☀️', clouds: '☁️', rain: '🌧️', drizzle: '🌦️',
    thunderstorm: '⛈️', snow: '❄️', mist: '🌫️', fog: '🌫️',
    haze: '🌫️', smoke: '🌫️',
  };
  return map[condition?.toLowerCase()] || '🌤️';
};

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatCategory = (cat) => {
  const map = {
    fruits: 'Fruit', vegetables: 'Vegetable', snacks: 'Snacks',
    beverages: 'Beverages', street_food: 'Street Food', sweets: 'Sweets',
    dairy: 'Dairy', flowers: 'Flowers', general: 'General', other: 'Other',
  };
  return map[cat] || 'General';
};

const getCategoryTip = (category) => {
  const tips = {
    fruits: 'Peak fruit buying happens between 7-10 AM. Try placing your stall near morning walkers for better sales!',
    vegetables: 'Fresh stock in the morning sells 30% faster. Consider sourcing directly from mandis (wholesale markets) to improve margins.',
    snacks: 'Evening snacks sell 40% more than morning. Time your fresh batches for 4-6 PM rush hour!',
    beverages: 'Hot days can triple your beverage sales. Always keep extra stock during summer months.',
    street_food: 'Consistency is key! Customers return to vendors who are at the same spot daily. Aim for the same time and place.',
    sweets: 'Festival seasons can 5x your sales. Plan early for Diwali, Holi, Raksha Bandhan, and local festivals!',
    dairy: 'Morning (6-9 AM) and evening (5-7 PM) are peak dairy hours. Plan your stock timing around these windows.',
    flowers: 'Temple areas and wedding halls are goldmines. Time your stock around pooja timings and weekend weddings.',
    general: 'Track which items sell fastest. Your top 3 items probably make up 70% of your revenue — focus on those!',
  };
  return tips[category] || tips.general;
};

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Summer Season ☀️';
  if (month >= 6 && month <= 9) return 'Monsoon Season 🌧️';
  if (month >= 10 && month <= 11) return 'Festival Season 🎉';
  return 'Winter Season ❄️';
};

const getSeasonalAdvice = (category) => {
  const month = new Date().getMonth() + 1;
  const season = month >= 3 && month <= 5 ? 'summer' : month >= 6 && month <= 9 ? 'monsoon' : month >= 10 && month <= 11 ? 'festival' : 'winter';

  const advice = {
    summer: {
      fruits: 'Mango, watermelon, and litchi are in peak demand. Source early before prices spike!',
      snacks: 'Cold items and ice gola sell like crazy. Consider adding nimbu pani or lassi to your menu.',
      beverages: 'This is YOUR season! Stock 40% more cold drinks. Sugarcane juice is a goldmine.',
      street_food: 'Lighter items sell better in heat. Chaat and gola outperform heavy snacks.',
      general: 'Cold beverages and water bottles are essential add-ons to any stall in summer.',
    },
    monsoon: {
      fruits: 'Rain-resistant fruits like banana and apple sell steadily. Avoid excess perishables.',
      snacks: 'Pakora + chai is the legendary combo! This is peak season for hot snacks.',
      beverages: 'Hot chai, coffee, and soup will fly off your stall. Stock up on tea leaves and milk!',
      street_food: 'Bhutta (corn), pakora, and chai are monsoon bestsellers. Set up near covered areas.',
      general: 'Hot food sells great in rain. Keep dry storage and waterproof covers for your stall.',
    },
    festival: {
      fruits: 'Festival demand for fruit baskets rises. Offer pre-packed gift combos!',
      snacks: 'Namkeen, sweets, and savory snacks see 3-5x demand during Diwali week.',
      beverages: 'Thandai for Holi, special drinks for Navratri — plan themed offerings!',
      street_food: 'Location near festival venues = jackpot. Scout locations early!',
      general: 'Festival weeks can make your best month. Stock 2-3x more and extend selling hours.',
    },
    winter: {
      fruits: 'Seasonal fruits like guava, orange, and strawberry are in demand. Stock warm items too.',
      snacks: 'Gajar halwa, gajak, and warm snacks dominate. Start evening sales earlier (4 PM).',
      beverages: 'Chai and coffee sales peak in winter. Consider adding hot chocolate or badam milk.',
      street_food: 'Momos, soup, and grilled items are winter favorites. Add them if possible!',
      general: 'Hot food dominates winter sales. Source warm beverages and snacks for maximum profit.',
    },
  };

  return advice[season]?.[category] || advice[season]?.general || 'Keep logging to get seasonal insights tailored for you!';
};

/**
 * Main entry point — generates all smart insights for a vendor.
 *
 * @param {string} vendorId
 * @returns {Object} { maturity, weather, insights[], entryCount }
 */
const generateSmartInsights = async (vendorId) => {
  const vendor = await User.findById(vendorId).lean();
  if (!vendor) throw new Error('Vendor not found');

  // Fetch last 30 days of entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const entries = await LedgerEntry.find({
    vendor: vendorId,
    date: { $gte: thirtyDaysAgo },
  }).sort({ date: -1 }).lean();

  const maturity = getMaturityLevel(entries.length);

  // Always get weather
  const weatherInsight = await getWeatherInsight(vendor);

  // Build insights based on maturity
  let stageInsights = [];
  switch (maturity) {
    case 'day0':
      stageInsights = getGettingStartedInsights(vendor);
      break;
    case 'early':
      stageInsights = await getEarlyStageInsights(vendor, entries);
      break;
    case 'growth':
      stageInsights = [
        ...(await getEarlyStageInsights(vendor, entries)),
        ...(await getGrowthStageInsights(vendor, entries)),
      ];
      break;
    case 'mature':
      stageInsights = [
        ...(await getGrowthStageInsights(vendor, entries)),
        ...(await getMatureStageInsights(vendor, entries)),
      ];
      break;
  }

  // Sort by priority
  const allInsights = [weatherInsight, ...stageInsights]
    .sort((a, b) => a.priority - b.priority);

  // Try to get demand forecast from Python ML service
  let forecast = null;
  try {
    forecast = await getDemandForecast(entries, vendor);
  } catch (err) {
    console.warn('[SmartInsights] ML forecast unavailable:', err.message);
  }

  return {
    maturity,
    entryCount: entries.length,
    maturityProgress: {
      current: entries.length,
      nextMilestone: maturity === 'day0' ? 1 : maturity === 'early' ? 4 : maturity === 'growth' ? 8 : 30,
      label: maturity === 'day0' ? 'Log your first day!'
        : maturity === 'early' ? 'Log 4 days for trend analysis'
          : maturity === 'growth' ? 'Log 8 days for full AI predictions'
            : 'Full AI intelligence active!',
    },
    weather: weatherInsight,
    insights: allInsights,
    forecast,
  };
};

/**
 * Call the Python ML microservice for demand forecasting.
 * Falls back gracefully if the service is unavailable.
 */
const getDemandForecast = async (entries, vendor) => {
  const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  try {
    // Prepare entries for the Python service
    const payload = {
      entries: entries.map(e => ({
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        items: (e.items || []).map(i => ({
          name: i.name || 'unknown',
          quantity: i.quantity || 0,
          unitPrice: i.unitPrice || 0,
          totalPrice: i.totalPrice || 0,
        })),
        expenses: (e.expenses || []).map(ex => ({
          category: ex.category || 'other',
          amount: ex.amount || 0,
          description: ex.description || '',
        })),
        missedProfits: (e.missedProfits || []).map(mp => ({
          item: mp.item || 'unknown',
          estimatedLoss: mp.estimatedLoss || 0,
        })),
        totalRevenue: e.totalRevenue || 0,
        totalExpenses: e.totalExpenses || 0,
        netProfit: e.netProfit || 0,
      })),
      forecastDays: 7,
      vendorName: vendor.name || 'Unknown',
      businessCategory: vendor.businessCategory || 'general',
    };

    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (err) {
    // Don't throw — forecast is optional
    console.warn('[SmartInsights] ML forecast error:', err.message);
    return null;
  }
};

module.exports = { generateSmartInsights, getDemandForecast };
