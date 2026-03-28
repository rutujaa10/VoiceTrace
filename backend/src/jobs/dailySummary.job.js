/**
 * Daily Summary Confirmation Job
 *
 * Runs daily at 9:30 PM IST.
 * Sends daily summary to each vendor via WhatsApp for confirmation.
 */

const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Insight = require('../models/Insight');
const { env } = require('../config/env');

let twilioClient = null;
try {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    const twilio = require('twilio');
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
} catch (e) { /* Twilio not available */ }

const run = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all entries today that haven't been confirmed
  const todayEntries = await LedgerEntry.find({
    date: { $gte: today },
    confirmedByVendor: false,
  }).populate('vendor');

  console.log(`[DailySummary] ${todayEntries.length} unconfirmed entries to send.`);

  for (const entry of todayEntries) {
    try {
      const vendor = entry.vendor;
      if (!vendor || !vendor.whatsappId) continue;

      const isHindi = vendor.preferredLanguage !== 'en';

      let msg = isHindi
        ? `📒 *Aaj ka Hisaab (${new Date().toLocaleDateString('hi-IN')}):*\n\n`
        : `📒 *Today's Summary (${new Date().toLocaleDateString('en-IN')}):*\n\n`;

      msg += isHindi ? `💰 Bikri: ₹${entry.totalRevenue}\n` : `💰 Revenue: ₹${entry.totalRevenue}\n`;
      msg += isHindi ? `💸 Kharcha: ₹${entry.totalExpenses}\n` : `💸 Expenses: ₹${entry.totalExpenses}\n`;
      msg += isHindi ? `📊 Munafa: ₹${entry.netProfit}\n` : `📊 Profit: ₹${entry.netProfit}\n`;

      if (entry.missedProfits.length > 0) {
        const missedTotal = entry.missedProfits.reduce((s, mp) => s + mp.estimatedLoss, 0);
        msg += isHindi
          ? `📉 Chhoota munafa: ~₹${missedTotal}\n`
          : `📉 Missed revenue: ~₹${missedTotal}\n`;
      }

      msg += isHindi
        ? `\n🎯 Loan Score: ${vendor.loanReadiness.score}/100 | Streak: ${vendor.loanReadiness.streak} din\n`
        : `\n🎯 Loan Score: ${vendor.loanReadiness.score}/100 | Streak: ${vendor.loanReadiness.streak} days\n`;

      msg += isHindi
        ? '\n_Sahi hai? Reply: YES ya NO_'
        : '\n_Correct? Reply: YES or NO_';

      // Send via WhatsApp
      if (twilioClient) {
        await twilioClient.messages.create({
          from: env.TWILIO_WHATSAPP_NUMBER,
          to: vendor.whatsappId,
          body: msg,
        });
      } else {
        console.log(`[DailySummary Mock] ${vendor.phone}: ${msg}`);
      }

      // Create insight record
      await Insight.create({
        vendor: vendor._id,
        type: 'daily_summary',
        title: isHindi ? 'Aaj ka Hisaab' : "Today's Summary",
        content: msg,
        data: {
          totalRevenue: entry.totalRevenue,
          totalExpenses: entry.totalExpenses,
          netProfit: entry.netProfit,
        },
        sentViaWhatsApp: !!twilioClient,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day TTL
      });

    } catch (err) {
      console.error(`[DailySummary] Error for entry ${entry._id}:`, err.message);
    }
  }

  console.log('[DailySummary] Complete.');
};

module.exports = { run };
