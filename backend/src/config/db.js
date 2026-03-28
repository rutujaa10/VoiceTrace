const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retry logic.
 */
const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voicetrace';

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(MONGODB_URI, options);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Connection error: ${error.message}`);
    // Retry after 5 seconds
    console.log('[DB] Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }

  mongoose.connection.on('error', (err) => {
    console.error(`[DB] Runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected. Attempting reconnection...');
  });
};

module.exports = connectDB;
