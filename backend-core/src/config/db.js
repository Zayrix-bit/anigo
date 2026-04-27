/* eslint-disable no-undef */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Do not exit process in production/vercel, let the app handle the error or retry
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
