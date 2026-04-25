const app = require('../backend-core/src/app');
const connectDB = require('../backend-core/src/config/db');

// Connect to MongoDB (Vercel will run this on every invocation, but Mongoose handles pooling)
connectDB();

module.exports = app;
