/**
 * Audio upload middleware using Multer.
 * Stores audio files to backend/storage/ with unique filenames.
 */

const multer = require('multer');
const path = require('path');
const { env } = require('../config/env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(env.STORAGE_PATH));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || '.ogg';
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/ogg',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/wav',
    'audio/webm',
    'audio/x-m4a',
    'audio/amr',          // WhatsApp voice notes
    'application/ogg',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Invalid audio format: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`);
    err.statusCode = 400;
    cb(err, false);
  }
};

const uploadAudio = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
    files: 1,
  },
});

module.exports = { uploadAudio };
