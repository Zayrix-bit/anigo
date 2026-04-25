/* eslint-disable no-undef */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  watchlist: [{
    animeId: { type: String, required: true },
    title: { type: String, required: true },
    coverImage: { type: String },
    status: { type: String, default: 'Planning' }, // Watching, Completed, On-Hold, Dropped, Planning
    progress: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now }
  }],
  continueWatching: [{
    animeId: { type: String, required: true },
    episode: { type: Number, required: true },
    time: { type: Number, required: true },
    totalTime: { type: Number },
    title: { type: String },
    coverImage: { type: String },
    lastUpdated: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
