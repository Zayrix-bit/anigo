const app = require('./user-backend/src/app');
const connectDB = require('./user-backend/src/config/db');

// Connect to MongoDB (Vercel will run this on every invocation, but Mongoose handles pooling)
connectDB();

module.exports = app;
