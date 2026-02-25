const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    logger.info('Attempting to connect to MongoDB...', {
      uri: config.database.uri ? config.database.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') : 'undefined',
      options: config.database.options
    });

    const conn = await mongoose.connect(config.database.uri, config.database.options);

    logger.info(`MongoDB connected successfully: ${conn.connection.host}`, {
      database: conn.connection.name,
      readyState: conn.connection.readyState,
      host: conn.connection.host,
      port: conn.connection.port
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error after connect:', {
        error: err.message,
        code: err.code,
        codeName: err.codeName,
        stack: err.stack
      });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected', {
        readyState: mongoose.connection.readyState
      });
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected', {
        host: mongoose.connection.host
      });
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('Database connection failed with detailed error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      stack: error.stack,
      reason: error.reason,
      uri: config.database.uri ? config.database.uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') : 'undefined'
    });

    // Additional specific error handling
    if (error.name === 'MongoNetworkError') {
      logger.error('MongoDB Network Error - Check internet connection and MongoDB Atlas IP whitelist');
    } else if (error.name === 'MongoParseError') {
      logger.error('MongoDB Parse Error - Check connection string format');
    } else if (error.name === 'MongoServerSelectionError') {
      logger.error('MongoDB Server Selection Error - Check if MongoDB server is running and accessible');
    } else if (error.code === 8000) {
      logger.error('MongoDB Authentication Error - Check username/password');
    }

    process.exit(1);
  }
};

module.exports = connectDatabase;