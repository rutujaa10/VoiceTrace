/**
 * VoiceTrace — Demo Data Seeder
 * Seeds 30 days of realistic street vendor data for judges demo.
 * 
 * Run: node scripts/seed-demo-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const LedgerEntry = require('../src/models/LedgerEntry');
const Insight = require('../src/models/Insight');
const User = require('../src/models/User');
const Item = require('../src/models/Item');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voicetrace';

// ── Product catalog (typical Indian street vendor) ──
const PRODUCTS = [
  { name: 'Samosa', basePrice: 15, baseQty: 40, variance: 0.25 },
  { name: 'Vada Pav', basePrice: 20, baseQty: 35, variance: 0.3 },
  { name: 'Chai', basePrice: 15, baseQty: 80, variance: 0.2 },
  { name: 'Poha', basePrice: 30, baseQty: 25, variance: 0.3 },
  { name: 'Bhel Puri', basePrice: 25, baseQty: 30, variance: 0.25 },
  { name: 'Pav Bhaji', basePrice: 60, baseQty: 20, variance: 0.3 },
  { name: 'Misal Pav', basePrice: 50, baseQty: 15, variance: 0.3 },
  { name: 'Cutting Chai', basePrice: 10, baseQty: 100, variance: 0.15 },
  { name: 'Egg Roll', basePrice: 40, baseQty: 20, variance: 0.3 },
  { name: 'Paneer Tikka', basePrice: 80, baseQty: 10, variance: 0.35 },
];

const EXPENSES = [
  { desc: 'Cooking Oil', cat: 'raw_material', baseAmt: 180 },
  { desc: 'Flour & Maida', cat: 'raw_material', baseAmt: 120 },
  { desc: 'Vegetables', cat: 'raw_material', baseAmt: 250 },
  { desc: 'Gas Cylinder', cat: 'raw_material', baseAmt: 100 },
  { desc: 'Auto Rickshaw', cat: 'transport', baseAmt: 80 },
  { desc: 'Stall Rent', cat: 'rent', baseAmt: 150 },
  { desc: 'Helper Wages', cat: 'labor', baseAmt: 200 },
  { desc: 'Packaging', cat: 'packaging', baseAmt: 50 },
];

// Random helper
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const vary = (base, pct) => Math.round(base * (1 + (Math.random() * 2 - 1) * pct));

// Weekend/holiday boost
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  // Find the active vendor (the currently logged-in user)
  const targetId = process.argv[2] || null;
  const vendor = targetId 
    ? await User.findById(targetId) 
    : await User.findOne({}).sort({ createdAt: -1 });
  if (!vendor) {
    console.error('❌ No vendor found! Register a vendor first.');
    process.exit(1);
  }
  console.log(`👤 Seeding data for vendor: ${vendor.name} (${vendor._id})`);

  // Clear existing data for this vendor
  const deletedEntries = await LedgerEntry.deleteMany({ vendor: vendor._id });
  const deletedInsights = await Insight.deleteMany({ vendor: vendor._id });
  const deletedItems = await Item.deleteMany({ vendor: vendor._id });
  console.log(`🗑️  Cleared: ${deletedEntries.deletedCount} entries, ${deletedInsights.deletedCount} insights, ${deletedItems.deletedCount} items`);

  // ── Seed 30 days of ledger entries ──
  const entries = [];
  const today = new Date();

  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    // Skip ~2 random days to show realistic gaps
    if (daysAgo > 2 && Math.random() < 0.07) continue;

    const weekendBoost = isWeekend(date) ? 1.3 : 1.0;

    // Pick 4-7 random products for this day
    const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
    const dayProducts = shuffled.slice(0, rand(4, 7));

    const items = dayProducts.map(p => {
      const qty = vary(p.baseQty, p.variance) * weekendBoost;
      const roundQty = Math.round(qty);
      return {
        name: p.name,
        quantity: roundQty,
        unitPrice: p.basePrice,
        totalPrice: roundQty * p.basePrice,
        confidence: 0.92 + Math.random() * 0.08,
        isApproximate: false,
        needsConfirmation: false,
      };
    });

    // Pick 2-4 expenses
    const dayExpenses = [...EXPENSES].sort(() => Math.random() - 0.5).slice(0, rand(2, 4));
    const expenses = dayExpenses.map(e => ({
      category: e.cat,
      description: e.desc,
      amount: vary(e.baseAmt, 0.2),
      confidence: 1.0,
      isApproximate: false,
      needsConfirmation: false,
    }));

    // Occasionally add missed profits
    const missedProfits = [];
    if (Math.random() < 0.25) {
      const missedItem = PRODUCTS[rand(0, PRODUCTS.length - 1)];
      missedProfits.push({
        item: missedItem.name,
        estimatedLoss: rand(100, 500),
        triggerPhrase: `${missedItem.name} khatam ho gaya`,
        confidence: 0.85,
      });
    }

    const transcript = items.map(it =>
      `${it.quantity} ${it.name} beche ${it.unitPrice} rupaye mein`
    ).join(', ') + '. ' + expenses.map(e =>
      `${e.amount} ka ${e.description} kharida`
    ).join(', ');

    const entry = new LedgerEntry({
      vendor: vendor._id,
      date,
      rawTranscript: transcript,
      language: 'hi',
      items,
      expenses,
      missedProfits,
      source: daysAgo % 3 === 0 ? 'manual' : 'web_speech_api',
      confirmedByVendor: daysAgo > 1,
      location: vendor.location,
      processingMeta: {
        llmModel: 'gemini-1.5-flash',
        llmTokensUsed: rand(200, 500),
        processedAt: date,
      },
    });

    await entry.save();
    entries.push(entry);
  }
  console.log(`📊 Seeded ${entries.length} ledger entries (30 days)`);

  // ── Update item catalog using the model's own method ──
  const catalogItems = PRODUCTS.map(p => ({
    name: p.name,
    quantity: rand(500, 2000),
    unitPrice: p.basePrice,
    totalPrice: rand(500, 2000) * p.basePrice,
  }));
  await Item.upsertFromExtraction(vendor._id, catalogItems, new Date());
  console.log(`📦 Seeded ${PRODUCTS.length} items in catalog`);

  // ── Seed Insights ──
  const insights = [];

  // 1. Stock Prediction (today)
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'prediction',
    title: '📦 Tomorrow\'s Stock Prediction',
    content: 'Based on your last 7 days of sales and the upcoming weekend, here\'s what we recommend stocking up on. Samosa and Chai sales typically spike by 30% on Saturdays.',
    data: {
      items: [
        { name: 'Samosa', suggestedQty: 55, reason: 'Weekend demand spike — your avg is 40, Saturdays hit 52' },
        { name: 'Chai', suggestedQty: 110, reason: 'Consistent top seller — never had leftover' },
        { name: 'Vada Pav', suggestedQty: 40, reason: 'Trending up 15% this week vs last week' },
        { name: 'Pav Bhaji', suggestedQty: 25, reason: 'Weekend favourite — sold out last 2 Saturdays' },
      ]
    },
    isRead: false,
  }));

  // 2. Missed Profit Alert
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'missed_profit',
    title: '📉 You Missed ₹850 in Potential Sales',
    content: 'In the last week, you ran out of Samosa on 3 days and Pav Bhaji on 2 days. If you had stocked 20% more, you could have earned an additional ₹850.',
    data: {
      items: [
        { name: 'Samosa', estimatedLoss: 450, daysOutOfStock: 3 },
        { name: 'Pav Bhaji', estimatedLoss: 400, daysOutOfStock: 2 },
      ]
    },
    isRead: false,
  }));

  // 3. Weekly Story
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'weekly_story',
    title: '📖 Your Week in Review',
    content: `🎉 Great week! Your total revenue was ₹${rand(12000, 18000).toLocaleString('en-IN')} with a healthy profit margin of ${rand(35, 48)}%. Samosa remains your star product — it contributed 32% of your total sales. Your expense ratio dropped from 42% to 38%, which means you're getting better at managing costs. Chai sales grew 12% compared to last week. Keep it up! 💪`,
    data: {
      totalRevenue: rand(12000, 18000),
      profitMargin: rand(35, 48),
      topProduct: 'Samosa',
      expenseRatio: 38,
    },
    isRead: false,
  }));

  // 4. Loan Milestone
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'loan_milestone',
    title: '🏦 Loan Score Improved!',
    content: 'Your loan readiness score increased from 35 to 58! You\'re now 58% ready for a micro-loan. Keep logging your sales daily — just 7 more consecutive days will push you to 70+.',
    data: {
      previousScore: 35,
      newScore: 58,
      milestone: '50+ reached',
    },
    isRead: false,
  }));

  // 5. Daily Summary
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'daily_summary',
    title: '📋 Yesterday\'s Summary',
    content: `Yesterday you earned ₹${rand(2500, 4000).toLocaleString('en-IN')} in revenue from ${rand(4, 7)} products. Your best seller was Chai (${rand(80, 120)} cups). Expenses were ₹${rand(500, 900)}, giving you a profit of ₹${rand(1800, 3200)}.`,
    data: {
      revenue: rand(2500, 4000),
      products: rand(4, 7),
      bestSeller: 'Chai',
      expenses: rand(500, 900),
    },
    isRead: false,
  }));

  // 6. Stock Advice
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'stock_advice',
    title: '💡 Smart Stock Tip',
    content: 'Your Paneer Tikka sales dropped 40% this week. Consider reducing stock by 3-4 plates and redirecting that budget to Egg Rolls which are trending up 25%.',
    data: {
      reduce: { name: 'Paneer Tikka', by: '30%', reason: 'dropping demand' },
      increase: { name: 'Egg Roll', by: '25%', reason: 'trending up' },
    },
    isRead: false,
  }));

  // 7. Weather Alert
  insights.push(new Insight({
    vendor: vendor._id,
    type: 'weather_alert',
    title: '🌧️ Rain Expected Tomorrow',
    content: 'Weather forecast shows rain tomorrow afternoon. Based on past rainy days, your Chai sales typically increase by 45% but Bhel Puri drops by 60%. Consider stocking more Chai and hot items.',
    weatherContext: {
      temp: 26,
      condition: 'rain',
      humidity: 85,
      forecast: 'Light to moderate rain expected from 2 PM',
      icon: '10d',
    },
    data: {
      stockMore: ['Chai', 'Samosa', 'Vada Pav'],
      stockLess: ['Bhel Puri', 'Paneer Tikka'],
    },
    isRead: false,
  }));

  for (const insight of insights) {
    await insight.save();
  }
  console.log(`💡 Seeded ${insights.length} insights`);

  // ── Update vendor loan score ──
  vendor.loanReadiness = {
    score: 58,
    streak: 12,
    lastLogDate: new Date(),
    revenueVariance: 0.18,
    avgDailyRevenue: rand(2800, 3500),
    expenseConsistency: 85,
    isLoanReady: false,
  };
  await vendor.save();
  console.log('🏦 Updated vendor loan score to 58/100');

  console.log('\n✅ DEMO DATA SEEDED SUCCESSFULLY!');
  console.log('   Open the app and refresh to see the data.\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
