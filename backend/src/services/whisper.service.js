/**
 * Transcription Service — Multi-Provider Audio-to-Text
 *
 * Provides audio transcription with automatic fallback:
 *   1. Gemini 2.0 Flash (native API with inline audio — supports OGG/AMR/WebM/MP4)
 *   2. Groq Whisper (free, fast whisper-large-v3-turbo)
 *   3. Local Whisper (Python subprocess, requires pip install openai-whisper + ffmpeg)
 *
 * WhatsApp voice notes come as OGG/Opus or AMR — Gemini handles these natively
 * without needing ffmpeg installed locally.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { env } = require('../config/env');

const WHISPER_RUNNER = path.join(__dirname, 'whisper_runner.py');

// MIME type mapping for audio formats
const MIME_TYPES = {
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.amr': 'audio/amr',
  '.mp3': 'audio/mpeg',
  '.mp4': 'audio/mp4',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.3gp': 'audio/3gpp',
};

/**
 * Main transcription entry point — tries providers in order.
 *
 * @param {string} filepath – Absolute path to the audio file.
 * @returns {{ text: string, language: string, duration: number, segments: Array, words: Array }}
 */
const transcribe = async (filepath, language = 'hi') => {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Audio file not found: ${filepath}`);
  }

  const fileSize = fs.statSync(filepath).size;
  console.log(`[Transcribe] File: ${path.basename(filepath)}, Size: ${(fileSize / 1024).toFixed(1)}KB`);

  if (fileSize === 0) {
    throw new Error('Audio file is empty (0 bytes) — possibly a failed download or empty voice note');
  }

  if (fileSize < 100) {
    console.warn(`[Transcribe] ⚠️ Audio file is very small (${fileSize} bytes) — may be corrupted`);
  }

  // Strategy: try cloud providers first (no local deps needed), then local Whisper
  const errors = [];

  // 1. Try Gemini (handles all audio formats natively, no ffmpeg needed)
  if (env.GEMINI_API_KEY) {
    try {
      console.log('[Transcribe] Trying Gemini...');
      const result = await transcribeWithGemini(filepath);
      console.log('[Transcribe] ✅ Gemini succeeded:', result.text.substring(0, 80) + '...');
      return result;
    } catch (err) {
      errors.push(`Gemini: ${err.message}`);
      console.warn('[Transcribe] Gemini failed:', err.message);
    }
  }

  // 2. Try Groq free Whisper API
  if (env.GROQ_API_KEY) {
    try {
      console.log('[Transcribe] Trying Groq Whisper...');
      const result = await transcribeWithGroq(filepath, language);
      console.log('[Transcribe] ✅ Groq succeeded:', result.text.substring(0, 80) + '...');
      return result;
    } catch (err) {
      errors.push(`Groq: ${err.message}`);
      console.warn('[Transcribe] Groq failed:', err.message);
    }
  }

  // 3. Try local Whisper (requires Python + openai-whisper + ffmpeg)
  try {
    console.log('[Transcribe] Trying local Whisper...');
    const result = await transcribeWithLocalWhisper(filepath);
    if (result.text && !result.text.startsWith('Mock transcription')) {
      console.log('[Transcribe] ✅ Local Whisper succeeded:', result.text.substring(0, 80) + '...');
      return result;
    }
    errors.push('Local Whisper: returned mock (not installed)');
  } catch (err) {
    errors.push(`Local Whisper: ${err.message}`);
    console.warn('[Transcribe] Local Whisper failed:', err.message);
  }

  // 4. Last resort: Try Gemini with a fresh key (env.GEMINI_API_KEY_2)
  if (env.GEMINI_API_KEY_2 && env.GEMINI_API_KEY_2 !== env.GEMINI_API_KEY) {
    try {
      console.log('[Transcribe] Trying Gemini (backup key)...');
      const result = await transcribeWithGemini(filepath, env.GEMINI_API_KEY_2);
      console.log('[Transcribe] ✅ Gemini backup succeeded');
      return result;
    } catch (err) {
      errors.push(`Gemini-backup: ${err.message}`);
    }
  }

  console.error(`[Transcribe] ❌ All providers failed:`);
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  throw new Error(`All transcription providers failed: ${errors.join(' | ')}`);
};

/**
 * Transcribe using Gemini native API with inline audio.
 * Gemini accepts raw audio bytes (base64) in many formats — no ffmpeg needed.
 *
 * Supports: OGG, AMR, MP3, MP4, WAV, WebM, 3GP (WhatsApp formats)
 */
const transcribeWithGemini = async (filepath, apiKey = env.GEMINI_API_KEY) => {
  const audioData = fs.readFileSync(filepath);
  const base64Audio = audioData.toString('base64');
  const ext = path.extname(filepath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'audio/ogg';

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          {
            text: `You are a transcription service for Indian street vendors.

TASK: Transcribe this audio EXACTLY as spoken. The speaker is an Indian street vendor speaking in Hindi, English, or Hinglish (mixed).

RULES:
1. Write EXACTLY what is said — do not summarize, interpret, or clean up.
2. Keep filler words (haan, toh, matlab, basically, like) — do NOT remove them.
3. Use Roman Hindi for Hindi words (e.g., "samose", "rupaye", "beche") — NOT Devanagari.
4. Preserve numbers as spoken (e.g., "pachaas" → "50", "do sau" → "200").
5. If code-switching (mixing Hindi/English), keep both languages as spoken.
6. If audio is unclear, transcribe your best guess — do not skip.

RESPOND WITH ONLY THE TRANSCRIPTION TEXT. No labels, no formatting, no quotes.`,
          },
        ],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
      },
    },
    {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error('Gemini returned empty transcription');
  }

  // Detect language from text
  const language = detectLanguage(text);

  return {
    text,
    language,
    duration: 0,
    segments: [{ start: 0, end: 0, text }],
    words: [], // Gemini doesn't provide word-level timestamps
  };
};

/**
 * Transcribe using Groq's free Whisper API.
 * Groq provides whisper-large-v3-turbo for free with generous rate limits.
 */
const transcribeWithGroq = async (filepath, language = 'hi') => {
  const form = new FormData();
  form.append('file', fs.createReadStream(filepath), {
    filename: path.basename(filepath),
    contentType: MIME_TYPES[path.extname(filepath).toLowerCase()] || 'audio/ogg',
  });
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', language);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('prompt',
    'Street vendor sales report in Hindi/Hinglish. Items: samosa, vada pav, chai, pani puri, biryani, juice. ' +
    'Numbers and prices: rupaye, rupees. Expenses: tel oil, aata flour, cheeni sugar, gas, rent, transport.'
  );

  const response = await axios.post(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      timeout: 60000,
      maxContentLength: 25 * 1024 * 1024,
    }
  );

  const data = response.data;

  // Build word-level timestamps
  const words = (data.words || []).map((w) => ({
    word: w.word?.trim() || '',
    start: w.start || 0,
    end: w.end || 0,
  }));

  return {
    text: data.text || '',
    language: detectLanguage(data.text || ''),
    duration: Math.round((data.duration || 0) * 1000),
    segments: (data.segments || []).map((s) => ({
      start: s.start || 0,
      end: s.end || 0,
      text: s.text?.trim() || '',
    })),
    words,
  };
};

/**
 * Transcribe using local OpenAI Whisper (Python subprocess).
 * Requires: pip install openai-whisper + ffmpeg installed on system.
 */
const transcribeWithLocalWhisper = async (filepath) => {
  const model = env.WHISPER_MODEL || 'base';

  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [WHISPER_RUNNER, filepath, model],
      {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          if (stderr && (stderr.includes('openai-whisper not installed') || stderr.includes('No module named'))) {
            return reject(new Error('Local Whisper not installed'));
          }
          if (stderr && stderr.includes('ffmpeg')) {
            return reject(new Error('ffmpeg not installed (required for local Whisper)'));
          }
          return reject(new Error(`Local Whisper failed: ${error.message}`));
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            return reject(new Error(`Whisper error: ${result.error}`));
          }

          return resolve({
            text: result.text || '',
            language: result.language || 'hi',
            duration: result.duration || 0,
            segments: result.segments || [],
            words: result.words || [],
          });
        } catch (parseError) {
          return reject(new Error(`Failed to parse Whisper output: ${parseError.message}`));
        }
      }
    );
  });
};

/**
 * Detect language from transcribed text.
 */
const detectLanguage = (text) => {
  const totalChars = text.replace(/\s/g, '').length || 1;
  const hindiChars = [...text].filter((c) => c.charCodeAt(0) >= 0x0900 && c.charCodeAt(0) <= 0x097F).length;
  const hindiRatio = hindiChars / totalChars;

  // Also check for common Hindi/Hinglish words in Roman script
  const hinglishWords = [
    'rupaye', 'rupees', 'rupay', 'beche', 'becha', 'kharida', 'samose', 'samosa',
    'aaj', 'kal', 'khatam', 'bikri', 'kharcha', 'munafa', 'hisaab', 'paisa',
    'lagbhag', 'lagbag', 'kuch', 'thoda', 'zyada', 'bohot', 'bahut',
    'mein', 'aur', 'toh', 'haan', 'nahi', 'wala', 'wali',
  ];

  const lowerText = text.toLowerCase();
  const hinglishCount = hinglishWords.filter((w) => lowerText.includes(w)).length;

  if (hindiRatio > 0.3) return 'hi';
  if (hindiRatio > 0.05 || hinglishCount >= 3) return 'hinglish';
  return 'en';
};

module.exports = { transcribe, transcribeWithGemini, transcribeWithGroq };
