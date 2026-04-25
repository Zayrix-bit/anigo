const Progress = require('../models/Progress');

// @desc    Save or update anime progress
// @route   POST /api/progress/save
// @access  Private
exports.saveProgress = async (req, res) => {
  try {
    const { animeId, episode, currentTime, duration, title, coverImage } = req.body;

    if (!animeId || episode === undefined || currentTime === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Upsert progress
    const progress = await Progress.findOneAndUpdate(
      { user: req.user._id, animeId: String(animeId) },
      { 
        episode, 
        currentTime, 
        duration, 
        title, 
        coverImage,
        updatedAt: Date.now()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      progress
    });
  } catch (error) {
    console.error("Save progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all progress for a user
// @route   GET /api/progress
// @access  Private
exports.getProgress = async (req, res) => {
  try {
    const progressList = await Progress.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      continueWatching: progressList
    });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete progress for a specific anime
// @route   DELETE /api/progress/:animeId
// @access  Private
exports.deleteProgress = async (req, res) => {
  try {
    await Progress.findOneAndDelete({ 
      user: req.user._id, 
      animeId: req.params.animeId 
    });

    res.status(200).json({
      success: true,
      message: 'Progress removed'
    });
  } catch (error) {
    console.error("Delete progress error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
