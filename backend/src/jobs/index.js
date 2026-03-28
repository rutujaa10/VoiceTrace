/**
 * VoiceTrace — Cron Jobs Orchestrator
 *
 * Schedules:
 * 1. Weather Prediction — Daily 9:00 PM IST → push stock advice via WhatsApp
 * 2. CSI Aggregation — Daily 10:00 PM IST → aggregate area-level trends
 * 3. Daily Summary — Daily 9:30 PM IST → send daily confirmation to vendors
 * 4. Weekly Story — Sundays 10:00 AM IST → generate narrative insight
 */

const cron = require('node-cron');
const weatherPredictionJob = require('./weatherPrediction.job');
const csiAggregationJob = require('./csiAggregation.job');
const dailySummaryJob = require('./dailySummary.job');
const weeklyStoryJob = require('./weeklyStory.job');

const initCronJobs = () => {
  console.log('[CRON] Initializing scheduled jobs...');

  // 1. Weather-Aware Stock Predictions — 9:00 PM IST daily
  cron.schedule('0 21 * * *', async () => {
    console.log('[CRON] Running weather prediction job...');
    try {
      await weatherPredictionJob.run();
    } catch (err) {
      console.error('[CRON] Weather prediction failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 2. CSI Aggregation — 10:00 PM IST daily
  cron.schedule('0 22 * * *', async () => {
    console.log('[CRON] Running CSI aggregation job...');
    try {
      await csiAggregationJob.run();
    } catch (err) {
      console.error('[CRON] CSI aggregation failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 3. Daily Summary Confirmation — 9:30 PM IST daily
  cron.schedule('30 21 * * *', async () => {
    console.log('[CRON] Running daily summary job...');
    try {
      await dailySummaryJob.run();
    } catch (err) {
      console.error('[CRON] Daily summary failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 4. Weekly Story — Sunday 10:00 AM IST
  cron.schedule('0 10 * * 0', async () => {
    console.log('[CRON] Running weekly story job...');
    try {
      await weeklyStoryJob.run();
    } catch (err) {
      console.error('[CRON] Weekly story failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[CRON] All jobs scheduled (IST timezone)');
};

module.exports = { initCronJobs };
