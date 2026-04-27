/* eslint-disable no-undef */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const progressRoutes = require('./routes/progressRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow cross-origin requests (Fixes CORS bug with frontend)
})); // Set security HTTP headers
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased for performance
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter); // Apply to API routes (if routes start with /api)
// Since current routes don't use /api prefix, let's apply a general limiter, or specifically to auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Increased for development/testing
  message: { success: false, message: 'Too many login attempts, please try again later' }
});

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/watchlist', watchlistRoutes);
app.use('/progress', progressRoutes);
app.use('/settings', settingsRoutes);
app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'node-backend',
    environment: process.env.VERCEL_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) => {
  res.send('API running');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
