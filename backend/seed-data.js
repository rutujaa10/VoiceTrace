/**
 * Seed Script — Populate 1 month of realistic ledger data for a vendor
 * 
 * Usage: node seed-data.js
 * 
 * This creates ~30 days of street food vendor data with realistic
 * daily variations, weekday/weekend patterns, and Indian vendor items.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PHONE = '9004946606';
const MONGODB_URI = process.env.MONGODB_URI;

// ── Item catalog (street food vendor) ──
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
  { desc: 'Oil & Ghee', category: 'raw_material', range: [100, 400] },
  { desc: 'Flour & Besan', category: 'raw_material', range: [80, 300] },
  { desc: 'Spices & Masala', category: 'raw_material', range: [50, 200] },
  { desc: 'Vegetables', category: 'raw_material', range: [100, 350] },
  { desc: 'Sugar & Milk', category: 'raw_material', range: [60, 250] },
  { desc: 'Gas Cylinder', category: 'other', range: [0, 0], occasional: true, occasionalAmt: [900, 1100] },
  { desc: 'Cart Rent', category: 'rent', range: [0, 0], monthly: true, monthlyAmt: 1500 },
  { desc: 'Transport / Rickshaw', category: 'transport', range: [30, 100] },
  { desc: 'Packaging (plates/bags)', category: 'packaging', range: [50, 150] },
  { desc: 'Helper wages', category: 'labor', range: [0, 0], weekly: true, weeklyAmt: [500, 800] },
];

const TRANSCRIPTS_HI = [
  'Aaj {items} beche. Kharcha {expenses} rupaye hua.',
  'Aaj ka business achha raha. {items} ki bikri hui aur kharcha {expenses} ka hua.',
  'Subah se shaam tak {items} beche. Kharcha mein {expenses} laga.',
  'Aaj thoda slow tha. {items} hi bike aur {expenses} ka kharcha hua.',
  'Bahut achha din raha! {items} beche. Aur kharcha sirf {expenses} tha.',
  'Aaj rain ki wajah se kam bikri hui. {items} beche bas.',
  'Festival season hai toh achhi sale hui. {items} beche. Kharcha {expenses}.',
];

// ── Helpers ──
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateDay(date) {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayOfMonth = date.getDate();

  // Weekend boost: 20-40% more sales
  const weekendMultiplier = isWeekend ? 1 + Math.random() * 0.3 : 1;
  
  // Pick 3-6 items for the day
  const numItems = rand(3, 6);
  const dayItems = pick(ITEMS, numItems);

  const items = dayItems.map(item => {
    const qty = Math.round(rand(item.baseQty[0], item.baseQty[1]) * weekendMultiplier);
    const unitPrice = item.basePrice + rand(-2, 3); // slight price fluctuation
    return {
      name: item.name,
      quantity: qty,
      unitPrice: Math.max(5, unitPrice),
      totalPrice: qty * Math.max(5, unitPrice),
      confidence: Math.random() > 0.15 ? 1.0 : parseFloat((0.6 + Math.random() * 0.3).toFixed(2)),
      isApproximate: Math.random() < 0.1,
      needsConfirmation: false,
    };
  });

  // 2-4 expenses per day
  const numExpenses = rand(2, 4);
  let dayExpenses = pick(EXPENSE_TYPES.filter(e => !e.occasional && !e.monthly && !e.weekly), numExpenses);
  
  const expenses = dayExpenses.map(exp => ({
    category: exp.category,
    amount: rand(exp.range[0], exp.range[1]),
    description: exp.desc,
    confidence: 1.0,
    isApproximate: false,
  })).filter(e => e.amount > 0);

  // Gas cylinder ~once every 15 days
  if (dayOfMonth === 5 || dayOfMonth === 20) {
    const gas = EXPENSE_TYPES.find(e => e.desc.includes('Gas'));
    expenses.push({
      category: gas.category,
      amount: rand(gas.occasionalAmt[0], gas.occasionalAmt[1]),
      description: gas.desc,
      confidence: 1.0,
      isApproximate: false,
    });
  }

  // Cart rent on 1st
  if (dayOfMonth === 1) {
    const rent = EXPENSE_TYPES.find(e => e.category === 'rent');
    expenses.push({
      category: rent.category,
      amount: rent.monthlyAmt,
      description: rent.desc,
      confidence: 1.0,
      isApproximate: false,
    });
  }

  // Helper wages every Saturday
  if (dayOfWeek === 6) {
    const helper = EXPENSE_TYPES.find(e => e.category === 'labor');
    expenses.push({
      category: helper.category,
      amount: rand(helper.weeklyAmt[0], helper.weeklyAmt[1]),
      description: helper.desc,
      confidence: 1.0,
      isApproximate: false,
    });
  }

  const totalRevenue = items.reduce((s, i) => s + i.totalPrice, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const itemNames = items.map(i => `${i.quantity} ${i.name}`).join(', ');
  const expTotal = totalExpenses;

  // Missed profit (randomly ~20% of days)
  const missedProfits = [];
  if (Math.random() < 0.2) {
    const missedItem = pick(ITEMS, 1)[0];
    missedProfits.push({
      item: missedItem.name,
      estimatedLoss: rand(100, 500),
      triggerPhrase: `${missedItem.name} shaam 4 baje khatam ho gaye`,
      confidence: 0.8,
    });
  }

  const transcript = TRANSCRIPTS_HI[rand(0, TRANSCRIPTS_HI.length - 1)]
    .replace('{items}', itemNames)
    .replace('{expenses}', String(expTotal));

  return {
    date,
    language: Math.random() > 0.3 ? 'hi' : 'hinglish',
    rawTranscript: transcript,
    items,
    expenses,
    missedProfits,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    confirmedByVendor: Math.random() > 0.15, // 85% confirmed
    hasPendingClarifications: items.some(i => i.isApproximate),
    processingMeta: {
      llmModel: 'gemini-2.0-flash',
      processedAt: date,
    },
  };
}

// ── Main ──
async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  // Load models
  const User = require('./src/models/User');
  const LedgerEntry = require('./src/models/LedgerEntry');

  // Find the user
  let user = await User.findOne({ phone: PHONE });
  if (!user) {
    console.log(`⚠️  User with phone ${PHONE} not found. Creating...`);
    user = await User.create({
      phone: PHONE,
      name: 'Abhishek (Demo Vendor)',
      businessCategory: 'street_food',
      preferredLanguage: 'hi',
      loanReadiness: {
        score: 0,
        streak: 0,
      },
    });
    console.log(`✅ Created user: ${user._id}`);
  } else {
    console.log(`✅ Found user: ${user.name || user.phone} (${user._id})`);
  }

  // Delete existing ledger entries for this user (clean slate)
  const deleted = await LedgerEntry.deleteMany({ vendor: user._id });
  console.log(`🗑️  Deleted ${deleted.deletedCount} existing entries\n`);

  // Generate 30 days of data (today minus 30 days to today)
  const entries = [];
  const today = new Date();
  today.setHours(18, 0, 0, 0); // Set to evening (typical logging time)

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(rand(17, 21), rand(0, 59), 0, 0); // 5 PM - 9 PM

    // Skip ~2-3 random days (realistic - vendors don't log every day)
    if (i > 0 && i < 30 && Math.random() < 0.08) {
      continue;
    }

    const dayData = generateDay(date);
    dayData.vendor = user._id;
    entries.push(dayData);
  }

  // Bulk insert
  const result = await LedgerEntry.insertMany(entries);
  console.log(`📊 Inserted ${result.length} ledger entries over 30 days\n`);

  // Update user loan readiness
  const summary = await LedgerEntry.getVendorSummary(user._id, 30);
  user.loanReadiness.streak = entries.length;
  user.loanReadiness.avgDailyRevenue = Math.round(summary.avgDailyRevenue || 0);
  user.loanReadiness.revenueVariance = summary.revenueStdDev
    ? parseFloat((summary.revenueStdDev / (summary.avgDailyRevenue || 1)).toFixed(3))
    : 0.2;
  user.loanReadiness.expenseConsistency = 85;
  user.loanReadiness.lastLogDate = today;
  user.recalculateLoanScore();
  await user.save();

  console.log('📈 Updated user loan readiness:');
  console.log(`   Score: ${user.loanReadiness.score}/100`);
  console.log(`   Streak: ${user.loanReadiness.streak} days`);
  console.log(`   Avg Daily Revenue: ₹${user.loanReadiness.avgDailyRevenue}`);
  console.log(`   Loan Ready: ${user.loanReadiness.isLoanReady ? '✅ Yes' : '❌ Not yet'}\n`);

  // Print summary
  console.log('═══════════════════════════════════');
  console.log('         SEED DATA SUMMARY         ');
  console.log('═══════════════════════════════════');
  console.log(`  Phone: ${PHONE}`);
  console.log(`  Entries: ${result.length} days`);
  console.log(`  Total Revenue: ₹${summary.totalRevenue?.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses: ₹${summary.totalExpenses?.toLocaleString('en-IN')}`);
  console.log(`  Total Profit: ₹${summary.totalProfit?.toLocaleString('en-IN')}`);
  console.log(`  Avg Daily: ₹${Math.round(summary.avgDailyRevenue || 0).toLocaleString('en-IN')}`);
  console.log('═══════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✅ Done! Data is ready. Login with phone: ' + PHONE);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
