/* eslint-disable no-undef */
const app = require('../backend-core/src/app');
const connectDB = require('../backend-core/src/config/db');

// Connect to MongoDB
if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.error('MONGO_URI is not defined in environment variables');
}

module.exports = app;
