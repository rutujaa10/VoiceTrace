/**
 * Whisper Transcription Service
 *
 * Transcribes audio files using local OpenAI Whisper (Python subprocess).
 * Supports Hindi, English, and Hinglish.
 */

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { env } = require('../config/env');

const WHISPER_RUNNER = path.join(__dirname, 'whisper_runner.py');

/**
 * Transcribe an audio file using local Whisper.
 * @param {string} filepath – Absolute path to the audio file.
 * @returns {{ text: string, language: string, duration: number, segments: Array }}
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
