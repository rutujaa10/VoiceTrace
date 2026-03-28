/**
 * Whisper Transcription Service — Enhanced
 *
 * Transcribes audio files using local OpenAI Whisper (Python subprocess).
 * Supports Hindi, English, and Hinglish.
 *
 * Enhanced for Phase 4 Feature 8: Returns word-level timestamps
 * for audio-to-entity mapping (voice playback with highlights).
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { env } = require('../config/env');

const WHISPER_RUNNER = path.join(__dirname, 'whisper_runner.py');

/**
 * Transcribe an audio file using local Whisper.
 *
 * @param {string} filepath – Absolute path to the audio file.
 * @returns {{ text: string, language: string, duration: number, segments: Array, words: Array }}
 *
 * words: [{ word: "samosa", start: 1.2, end: 1.5 }, ...]
 *        Used by the frontend to seek to specific audio positions
 *        when a ledger item is tapped (Phase 4 Feature 8).
 */
const transcribe = async (filepath) => {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Audio file not found: ${filepath}`);
  }

  const model = env.WHISPER_MODEL || 'base';

  return new Promise((resolve, reject) => {
    execFile(
      'python',
      [WHISPER_RUNNER, filepath, model],
      {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('[Whisper] Transcription error:', error.message);
          if (stderr) console.error('[Whisper] stderr:', stderr);

          // Fallback to mock if Whisper is not available
          if (stderr && stderr.includes('openai-whisper not installed')) {
            console.warn('[Whisper] Local Whisper not installed. Returning mock transcription.');
            return resolve({
              text: 'Mock transcription: Aaj 50 samose beche 10 rupaye ke, aur 200 rupaye ka tel kharida',
              language: 'hi',
              duration: 0,
              segments: [],
              words: [
                { word: 'Aaj', start: 0.0, end: 0.3 },
                { word: '50', start: 0.4, end: 0.6 },
                { word: 'samose', start: 0.7, end: 1.0 },
                { word: 'beche', start: 1.1, end: 1.3 },
                { word: '10', start: 1.4, end: 1.6 },
                { word: 'rupaye', start: 1.7, end: 2.0 },
                { word: 'ke', start: 2.1, end: 2.2 },
                { word: 'aur', start: 2.5, end: 2.7 },
                { word: '200', start: 2.8, end: 3.1 },
                { word: 'rupaye', start: 3.2, end: 3.5 },
                { word: 'ka', start: 3.6, end: 3.7 },
                { word: 'tel', start: 3.8, end: 4.0 },
                { word: 'kharida', start: 4.1, end: 4.5 },
              ],
            });
          }

          return reject(new Error(`Transcription failed: ${error.message}`));
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
            words: result.words || [], // word-level timestamps
          });
        } catch (parseError) {
          console.error('[Whisper] Failed to parse output:', stdout);
          return reject(new Error(`Failed to parse Whisper output: ${parseError.message}`));
        }
      }
    );
  });
};

module.exports = { transcribe };
