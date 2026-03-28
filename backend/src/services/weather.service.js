/**
 * Weather Service — OpenWeatherMap Integration
 *
 * Fetches current weather and next-day forecast for a location.
 * Used by the prediction cron job to generate weather-aware stock advice.
 */

const axios = require('axios');
const { env } = require('../config/env');

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Get current weather + next-day forecast.
 * @param {number} lat
 * @param {number} lng
 * @returns {{ current, forecast, advisory }}
 */
const getWeatherForecast = async (lat, lng) => {
  if (!env.OPENWEATHERMAP_API_KEY) {
    console.warn('[Weather] API key not configured. Using mock data.');
    return getMockWeather();
  }

  try {
    // 5-day / 3-hour forecast
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: env.OPENWEATHERMAP_API_KEY,
        units: 'metric',
        cnt: 8, // next 24 hours (8 x 3hr intervals)
      },
    });

    const forecasts = response.data.list;
    const current = forecasts[0];

    // Find tomorrow's daytime forecast (noon-ish)
    const tomorrow = forecasts.find((f) => {
      const hour = new Date(f.dt * 1000).getHours();
      return hour >= 10 && hour <= 14;
    }) || forecasts[4]; // fallback to ~12 hours ahead

    const forecast = {
      temp: Math.round(tomorrow.main.temp),
      feelsLike: Math.round(tomorrow.main.feels_like),
      condition: tomorrow.weather[0].main.toLowerCase(),
      description: tomorrow.weather[0].description,
      humidity: tomorrow.main.humidity,
      windSpeed: tomorrow.wind.speed,
      icon: tomorrow.weather[0].icon,
      rainProbability: tomorrow.pop || 0,
    };

    // Generate advisory
    const advisory = generateWeatherAdvisory(forecast);

    return {
      current: {
        temp: Math.round(current.main.temp),
        condition: current.weather[0].main.toLowerCase(),
        humidity: current.main.humidity,
      },
      forecast,
      advisory,
    };
  } catch (error) {
    console.error('[Weather] API error:', error.message);
    return getMockWeather();
  }
};

/**
 * Generate a simple advisory based on weather conditions.
 */
const generateWeatherAdvisory = (forecast) => {
  const advisories = [];

  // Rain
  if (forecast.condition === 'rain' || forecast.rainProbability > 0.5) {
    advisories.push({
      type: 'rain',
      severity: forecast.rainProbability > 0.7 ? 'high' : 'moderate',
      message_hi: 'Kal baarish ke chances hain. Cold items 20% kam laana.',
      message_en: 'Rain expected tomorrow. Reduce cold items by 20%.',
      stockAdjust: { cold_items: -20, hot_items: +30 },
    });
  }

  // Extreme heat
  if (forecast.temp > 40) {
    advisories.push({
      type: 'heat',
      severity: 'high',
      message_hi: `Kal bohot garmi hogi (${forecast.temp}°C). Cold drinks aur ice gola zyada laana!`,
      message_en: `Extreme heat tomorrow (${forecast.temp}°C). Stock up on cold drinks and ice gola!`,
      stockAdjust: { cold_items: +40, hot_items: -20 },
    });
  } else if (forecast.temp > 35) {
    advisories.push({
      type: 'heat',
      severity: 'moderate',
      message_hi: `Kal garmi hogi (${forecast.temp}°C). Cold drinks zyada rakhna.`,
      message_en: `Hot day tomorrow (${forecast.temp}°C). Keep extra cold drinks.`,
      stockAdjust: { cold_items: +20 },
    });
  }

  // Cold
  if (forecast.temp < 15) {
    advisories.push({
      type: 'cold',
      severity: 'moderate',
      message_hi: `Kal thand hogi (${forecast.temp}°C). Chai aur gajar halwa zyada rakhna.`,
      message_en: `Cold day tomorrow (${forecast.temp}°C). Stock hot beverages and warm snacks.`,
      stockAdjust: { hot_items: +30, cold_items: -30 },
    });
  }

  // High humidity (muggy)
  if (forecast.humidity > 85 && forecast.temp > 30) {
    advisories.push({
      type: 'humid',
      severity: 'moderate',
      message_hi: 'Kal umass hogi. Nimbu paani aur cold drinks zyada rakhna.',
      message_en: 'Humid day tomorrow. Stock lemon water and cold drinks.',
      stockAdjust: { cold_items: +15 },
    });
  }

  return advisories;
};

const getMockWeather = () => ({
  current: { temp: 32, condition: 'clear', humidity: 55 },
  forecast: {
    temp: 34,
    feelsLike: 37,
    condition: 'clear',
    description: 'clear sky',
    humidity: 50,
    windSpeed: 3.5,
    icon: '01d',
    rainProbability: 0.1,
  },
  advisory: [],
});

module.exports = { getWeatherForecast };
