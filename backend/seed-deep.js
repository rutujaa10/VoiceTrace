/**
 * Seed data for Deep (user +919004946606, ID: 69c79244ce8dd9a9616c3ac8)
 * Adds 30 days of entries, skipping days that already have data
 */
require('dotenv').config();
const mongoose = require('mongoose');
const LedgerEntry = require('./src/models/LedgerEntry');
const User = require('./src/models/User');

const VENDOR_ID = '69c79244ce8dd9a9616c3ac8';

const ITEMS = [
  { name: 'Samosa', baseQty: [30, 80], basePrice: 10 },
  { name: 'Kachori', baseQty: [20, 50], basePrice: 12 },
  { name: 'Chai', baseQty: [40, 100], basePrice: 10 },
  { name: 'Vada Pav', baseQty: [15, 45], basePrice: 15 },
  { name: 'Jalebi', baseQty: [5, 25], basePrice: 40 },
  { name: 'Poha', baseQty: [10, 30], basePrice: 20 },
  { name: 'Pav Bhaji', baseQty: [10, 35], basePrice: 40 },
  { name: 'Lassi', baseQty: [10, 30], basePrice: 20 },
  { name: 'Pakoda', baseQty: [15, 40], basePrice: 10 },
  { name: 'Dahi Vada', baseQty: [8, 25], basePrice: 15 },
];

const EXPENSE_TYPES = [
  { desc: 'Oil & Ghee', cat: 'raw_material', range: [100, 400] },
  { desc: 'Flour & Besan', cat: 'raw_material', range: [80, 300] },
  { desc: 'Spices', cat: 'raw_material', range: [50, 200] },
  { desc: 'Vegetables', cat: 'raw_material', range: [100, 350] },
  { desc: 'Sugar & Milk', cat: 'raw_material', range: [60, 250] },
  { desc: 'Transport', cat: 'transport', range: [30, 100] },
  { desc: 'Packaging', cat: 'packaging', range: [50, 150] },
];

function rand(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr, n) { return [...arr].sort(() => 0.5 - Math.random()).slice(0, n); }

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const entries = [];
  const today = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(rand(17, 21), rand(0, 59), 0, 0);

    // Check if entry already exists for this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const exists = await LedgerEntry.findOne({
      vendor: VENDOR_ID,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (exists) {
      console.log(`  Day -${i}: already has entry, skipping`);
      continue;
    }

    // Skip ~2 random days for realism
    if (i > 0 && i < 30 && Math.random() < 0.06) {
      console.log(`  Day -${i}: skipped (rest day)`);
      continue;
    }

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const mult = isWeekend ? 1 + Math.random() * 0.3 : 1;
    const dayItems = pick(ITEMS, rand(3, 6));

    const items = dayItems.map(it => {
      const qty = Math.round(rand(it.baseQty[0], it.baseQty[1]) * mult);
      const up = Math.max(5, it.basePrice + rand(-2, 3));
      return {
        name: it.name, quantity: qty, unitPrice: up,
        totalPrice: qty * up, confidence: 1.0,
        isApproximate: Math.random() < 0.08,
      };
    });

    const dayExp = pick(EXPENSE_TYPES, rand(2, 4));
    const expenses = dayExp.map(e => ({
      category: e.cat, amount: rand(e.range[0], e.range[1]),
      description: e.desc, confidence: 1.0,
    }));

    if (date.getDay() === 6) expenses.push({ category: 'labor', amount: rand(500, 800), description: 'Helper wages', confidence: 1.0 });
    if (date.getDate() === 5 || date.getDate() === 20) expenses.push({ category: 'other', amount: rand(900, 1100), description: 'Gas Cylinder', confidence: 1.0 });

    const totalRevenue = items.reduce((s, i) => s + i.totalPrice, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const missedProfits = [];
    if (Math.random() < 0.2) {
      const mi = pick(ITEMS, 1)[0];
      missedProfits.push({ item: mi.name, estimatedLoss: rand(100, 500), triggerPhrase: mi.name + ' shaam ko khatam ho gaye', confidence: 0.8 });
    }

    entries.push({
      vendor: VENDOR_ID,
      date,
      language: Math.random() > 0.3 ? 'hi' : 'hinglish',
      rawTranscript: 'Aaj ' + items.map(i => i.quantity + ' ' + i.name).join(', ') + ' beche. Kharcha ' + totalExpenses + ' hua.',
      items, expenses, missedProfits,
      totalRevenue, totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      confirmedByVendor: Math.random() > 0.12,
      hasPendingClarifications: items.some(i => i.isApproximate),
      processingMeta: { llmModel: 'gemini-2.0-flash', processedAt: date },
    });

    console.log(`  Day -${i}: ₹${totalRevenue} revenue, ${items.length} items`);
  }

  if (entries.length > 0) {
    const result = await LedgerEntry.insertMany(entries);
    console.log(`\n✅ Inserted ${result.length} new entries`);

    // Update loan readiness
    const user = await User.findById(VENDOR_ID);
    const summary = await LedgerEntry.getVendorSummary(VENDOR_ID, 30);
    const totalEntries = await LedgerEntry.countDocuments({ vendor: VENDOR_ID });

    user.loanReadiness.streak = totalEntries;
    user.loanReadiness.avgDailyRevenue = Math.round(summary.avgDailyRevenue || 0);
    user.loanReadiness.revenueVariance = summary.revenueStdDev
      ? parseFloat((summary.revenueStdDev / (summary.avgDailyRevenue || 1)).toFixed(3))
      : 0.2;
    user.loanReadiness.expenseConsistency = 85;
    user.loanReadiness.lastLogDate = new Date();
    user.recalculateLoanScore();
    await user.save();

    console.log(`\n📊 Summary:`);
    console.log(`   Total entries: ${totalEntries}`);
    console.log(`   Revenue (30d): ₹${summary.totalRevenue?.toLocaleString('en-IN')}`);
    console.log(`   Loan Score: ${user.loanReadiness.score}/100`);
  } else {
    console.log('\nAll days already have entries!');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
