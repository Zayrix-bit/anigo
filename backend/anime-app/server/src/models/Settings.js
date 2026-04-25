const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  titleLanguage: {
    type: String,
    enum: ['EN', 'JP'],
    default: 'EN'
  },
  videoLanguage: {
    type: String,
    enum: ['Any', 'Hard Sub', 'Soft Sub', 'Dub'],
    default: 'Any'
  },
  skipSeconds: {
    type: Number,
    default: 5
  },
  bookmarksPerPage: {
    type: Number,
    default: 20
  },
  autoPlay: {
    type: Boolean,
    default: true
  },
  autoNext: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
