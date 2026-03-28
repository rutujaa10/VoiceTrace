/**
 * Weather Prediction Cron Job
 *
 * Runs daily at 9 PM IST.
 * For each active vendor with a location:
 *   1. Fetch next-day weather from OpenWeatherMap
 *   2. Check for upcoming holidays (static JSON)
 *   3. Cross-reference with vendor's past sales data
 *   4. Generate stock advice insight
 *   5. Send proactive WhatsApp message
 */

const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Insight = require('../models/Insight');
const weatherService = require('../services/weather.service');
const holidays = require('../config/indianHolidays.json');
const { env } = require('../config/env');

let twilioClient = null;
try {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    const twilio = require('twilio');
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
} catch (e) { /* Twilio not available */ }

/**
 * Check if a holiday is coming up in the next 2 days.
 */
const getUpcomingHoliday = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const checkDates = [tomorrow, dayAfter].map((d) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  });

  return holidays.holidays.find((h) => checkDates.includes(h.date));
};

/**
 * Get seasonal factors for current month.
 */
const getSeasonalFactors = () => {
  const month = new Date().getMonth() + 1;
  return holidays.seasonalFactors.find((s) => s.months.includes(month));
};

const run = async () => {
  const vendors = await User.find({
    isActive: true,
    location: { $ne: null },
  });

  console.log(`[WeatherJob] Processing ${vendors.length} vendors...`);

  const upcomingHoliday = getUpcomingHoliday();
  const season = getSeasonalFactors();

  for (const vendor of vendors) {
    try {
      const [lng, lat] = vendor.location.coordinates;
      const weather = await weatherService.getWeatherForecast(lat, lng);

      // Get vendor's recent top-selling items
      const recentEntries = await LedgerEntry.find({
        vendor: vendor._id,
        date: { $gte: daysAgo(7) },
      }).lean();

      const topItems = getTopItems(recentEntries);

      // Build advice
      let advice = [];
      let title = '';

      // Weather-based advice
      if (weather.advisory.length > 0) {
        title = weather.advisory[0].type === 'rain'
          ? '🌧️ Kal Baarish — Stock Advice'
          : weather.advisory[0].type === 'heat'
            ? '🔥 Garmi Alert — Stock Advice'
            : '❄️ Thand Alert — Stock Advice';

        weather.advisory.forEach((adv) => {
          advice.push(vendor.preferredLanguage === 'en' ? adv.message_en : adv.message_hi);
        });
      }

      // Holiday-based advice
      let holidayContext = null;
      if (upcomingHoliday) {
        holidayContext = {
          name: upcomingHoliday.name,
          type: upcomingHoliday.type,
          expectedImpact: upcomingHoliday.expectedImpact,
          affectedItems: upcomingHoliday.affectedItems,
        };

        const lang = vendor.preferredLanguage;
        if (lang === 'en') {
          advice.push(`🎉 ${upcomingHoliday.name} is coming! Expected: ${upcomingHoliday.expectedImpact}. Stock up on: ${upcomingHoliday.affectedItems.join(', ')}.`);
        } else {
          advice.push(`🎉 ${upcomingHoliday.name} aa raha hai! ${upcomingHoliday.affectedItems.join(', ')} zyada rakhna.`);
        }
        title = title || `🎉 ${upcomingHoliday.name} — Stock Advice`;
      }

      // Seasonal advice
      if (season && !title) {
        title = '📊 Kal ka Stock Advice';
        if (season.highDemand.length > 0) {
          const items = season.highDemand.slice(0, 3).join(', ');
          advice.push(
            vendor.preferredLanguage === 'en'
              ? `Seasonal trend: ${items} are in high demand.`
              : `Season mein demand hai: ${items}`
          );
        }
      }

      if (advice.length === 0) continue; // No advice needed

      // Save insight
      const insight = await Insight.create({
        vendor: vendor._id,
        type: 'prediction',
        title: title || '📊 Stock Advice',
        content: advice.join('\n'),
        data: {
          topItems,
          weatherAdvisory: weather.advisory,
          season: season?.season,
        },
        weatherContext: {
          temp: weather.forecast.temp,
          condition: weather.forecast.condition,
          humidity: weather.forecast.humidity,
          forecast: weather.forecast.description,
        },
        holidayContext,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48hr TTL
      });

      // Send WhatsApp message
      if (twilioClient && vendor.whatsappId) {
        const msg = `${title}\n\n${advice.join('\n')}\n\n🌡️ Kal: ${weather.forecast.temp}°C, ${weather.forecast.description}`;
        await twilioClient.messages.create({
          from: env.TWILIO_WHATSAPP_NUMBER,
          to: vendor.whatsappId,
          body: msg,
        });
        insight.sentViaWhatsApp = true;
        insight.sentAt = new Date();
        await insight.save();
      }

    } catch (err) {
      console.error(`[WeatherJob] Error for vendor ${vendor._id}:`, err.message);
    }
  }

  console.log('[WeatherJob] Complete.');
};

const getTopItems = (entries) => {
  const itemMap = {};
  entries.forEach((e) => {
    (e.items || []).forEach((item) => {
      if (!itemMap[item.name]) {
        itemMap[item.name] = { total: 0, count: 0 };
      }
      itemMap[item.name].total += item.totalPrice;
      itemMap[item.name].count += item.quantity;
    });
  });

  return Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

module.exports = { run };
