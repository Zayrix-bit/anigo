const Settings = require('../models/Settings');

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ user: req.user._id });
    
    // Create default settings if not exists
    if (!settings) {
      settings = await Settings.create({ user: req.user._id });
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const { titleLanguage, videoLanguage, skipSeconds, bookmarksPerPage, autoPlay, autoNext } = req.body;

    const settings = await Settings.findOneAndUpdate(
      { user: req.user._id },
      { 
        titleLanguage, 
        videoLanguage, 
        skipSeconds, 
        bookmarksPerPage, 
        autoPlay, 
        autoNext,
        updatedAt: Date.now() 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
