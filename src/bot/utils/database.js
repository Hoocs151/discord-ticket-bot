const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'discord-tickets',
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// Handle connection errors
mongoose.connection.on('error', err => {
  logger.error('MongoDB connection error:', { error: err.message, stack: err.stack });
  // Only exit if it's a critical error
  if (err.name === 'MongoServerSelectionError') {
    logger.error('Critical MongoDB error - shutting down');
    process.exit(1);
  }
});

// Handle disconnection
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
  setTimeout(connectDatabase, 5000); // Retry after 5 seconds
});

// Handle successful reconnection
mongoose.connection.on('connected', () => {
  logger.info('MongoDB reconnected successfully');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing MongoDB connection:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason: reason.message, stack: reason.stack, promise });
});

module.exports = connectDatabase; 