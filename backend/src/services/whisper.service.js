/**
 * Whisper Transcription Service
 *
 * Transcribes audio files using OpenAI Whisper API.
 * Supports Hindi, English, and Hinglish.
 */

const fs = require('fs');
const OpenAI = require('openai');
const { env } = require('../config/env');

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * Transcribe an audio file.
 * @param {string} filepath – Absolute path to the audio file.
 * @returns {{ text: string, language: string, duration: number }}
 */
const transcribe = async (filepath) => {
  if (!openai) {
    console.warn('[Whisper] OpenAI API key not configured. Returning mock transcription.');
    return {
      text: 'Mock transcription: Aaj 50 samose beche 10 rupaye ke, aur 200 rupaye ka tel kharida',
      language: 'hi',
      duration: 0,
    };
  }

  const startTime = Date.now();

  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filepath),
      model: 'whisper-1',
      language: 'hi',          // Hint for Hindi (works for Hinglish too)
      response_format: 'verbose_json',
      prompt: 'Street vendor sales report in Hindi/Hinglish. Items sold, prices, quantities, expenses. ' +
              'Words like samosa, vada pav, chai, gola, paan, biryani, juice, lassi, pakora.',
    });

    const duration = Date.now() - startTime;

    // Detect language from response
    let detectedLanguage = 'hi';
    const text = response.text || '';
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length || 1;

    if (hindiChars / totalChars > 0.3) {
      detectedLanguage = 'hi';
    } else if (hindiChars / totalChars > 0.05) {
      detectedLanguage = 'hinglish';
    } else {
      detectedLanguage = 'en';
    }

    return {
      text: response.text,
      language: detectedLanguage,
      duration,
      segments: response.segments || [],
    };
  } catch (error) {
    console.error('[Whisper] Transcription error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
};

module.exports = { transcribe };
