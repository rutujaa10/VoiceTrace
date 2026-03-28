/**
 * Weekly Story Generation Job
 *
 * Runs every Sunday at 10:00 AM IST.
 * Generates a plain-language narrative of each vendor's week
 * using AgentRouter AI (OpenAI-compatible) for "Story Mode" insights.
 */

const OpenAI = require('openai');
const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Insight = require('../models/Insight');
const { env } = require('../config/env');

const openai = env.AI_API_KEY
  ? new OpenAI({ apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL })
  : null;

const run = async () => {
  const vendors = await User.find({ isActive: true });
  console.log(`[WeeklyStory] Generating stories for ${vendors.length} vendors...`);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  for (const vendor of vendors) {
    try {
      const entries = await LedgerEntry.find({
        vendor: vendor._id,
        date: { $gte: weekAgo },
      }).sort({ date: 1 }).lean();

      if (entries.length === 0) continue;

      const totalRevenue = entries.reduce((s, e) => s + e.totalRevenue, 0);
      const totalExpenses = entries.reduce((s, e) => s + e.totalExpenses, 0);
      const totalProfit = totalRevenue - totalExpenses;
      const totalMissed = entries.reduce((s, e) =>
        s + e.missedProfits.reduce((ms, mp) => ms + mp.estimatedLoss, 0), 0);

      const itemMap = {};
      entries.forEach((e) => {
        e.items.forEach((item) => {
          if (!itemMap[item.name]) itemMap[item.name] = { qty: 0, total: 0 };
          itemMap[item.name].qty += item.quantity;
          itemMap[item.name].total += item.totalPrice;
        });
      });

      const topItems = Object.entries(itemMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);

      let storyContent;

      if (openai) {
        const prompt = buildStoryPrompt(vendor, entries, {
          totalRevenue, totalExpenses, totalProfit, totalMissed, topItems,
        });

        const response = await openai.chat.completions.create({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            { role: 'system', content: 'You are a friendly, encouraging business narrator for Indian street vendors. Write in simple, warm language. Use Hindi words naturally when the vendor prefers Hindi.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        storyContent = response.choices[0].message.content;
      } else {
        storyContent = generateMockStory(vendor, {
          totalRevenue, totalExpenses, totalProfit, topItems, entryCount: entries.length,
        });
      }

      await Insight.create({
        vendor: vendor._id,
        type: 'weekly_story',
        title: `📖 ${vendor.displayName} ki Hafte ki Kahani`,
        content: storyContent,
        data: {
          totalRevenue, totalExpenses, totalProfit, totalMissed,
          topItems: topItems.map(([name, data]) => ({ name, ...data })),
          daysLogged: entries.length,
        },
      });

    } catch (err) {
      console.error(`[WeeklyStory] Error for vendor ${vendor._id}:`, err.message);
    }
  }

  console.log('[WeeklyStory] Complete.');
};

const buildStoryPrompt = (vendor, entries, stats) => {
  const lang = vendor.preferredLanguage === 'en' ? 'English' : 'Hindi/Hinglish';
  const topItemsStr = stats.topItems
    .map(([name, data]) => `${name}: ${data.qty} units, ₹${data.total}`)
    .join(', ');

  return `Write a warm, encouraging weekly business story for a street vendor in ${lang}.

Vendor: ${vendor.displayName}
Business: ${vendor.businessCategory}
Days logged this week: ${entries.length}/7
Total Revenue: ₹${stats.totalRevenue}
Total Expenses: ₹${stats.totalExpenses}
Net Profit: ₹${stats.totalProfit}
Missed Revenue: ₹${stats.totalMissed}
Top selling items: ${topItemsStr}
Loan Readiness Score: ${vendor.loanReadiness.score}/100
Streak: ${vendor.loanReadiness.streak} days

Write 3-4 short paragraphs. Include:
1. A warm greeting and weekly recap
2. Highlight their best selling item and profit
3. If missed revenue > 0, gently mention they could earn more
4. Encouragement about their loan readiness progress
5. A motivational closing

Keep it under 200 words. Use simple language.`;
};

const generateMockStory = (vendor, stats) => {
  const name = vendor.displayName;
  const topItem = stats.topItems[0] ? stats.topItems[0][0] : 'items';

  return `📖 *${name} ka Hafta*

Namaste ${name}! Ye raha aapke hafte ka hisaab.

Is hafte aapne ${stats.entryCount} din record kiya. Aapki total bikri ₹${stats.totalRevenue} rahi aur kharcha ₹${stats.totalExpenses} hua. Aapka munafa ₹${stats.totalProfit} raha — bahut accha! 👏

Aapka sabse zyada bikne wala item raha "${topItem}". Isko aur zyada stock rakhne se fayda ho sakta hai.

🎯 Aapka Loan Readiness Score ${vendor.loanReadiness.score}/100 hai. ${
  vendor.loanReadiness.score >= 75
    ? 'Mubaarak ho — aap PM SVANidhi loan ke liye tayaar hain! 🎉'
    : `Aur ${75 - vendor.loanReadiness.score} points chahiye. Rozaana record karte rahiye!`
}

Aage badhte rahiye — aap bahut accha kaam kar rahe hain! 💪🔥`;
};

module.exports = { run };
