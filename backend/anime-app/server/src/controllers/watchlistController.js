const User = require('../models/User');

// @desc    Get user watchlist
// @route   GET /watchlist
// @access  Private
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      watchlist: user.watchlist || []
    });
  } catch (error) {
    console.error("Get watchlist error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add to watchlist
// @route   POST /watchlist/add
// @access  Private
exports.addToWatchlist = async (req, res) => {
  try {
    const { animeId, title, coverImage, status, progress, score } = req.body;
    
    if (!animeId || !title) {
      return res.status(400).json({ success: false, message: 'Please provide animeId and title' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already in watchlist
    const existingIndex = user.watchlist.findIndex(item => item.animeId === String(animeId));
    
    if (existingIndex > -1) {
      // If already exists, update the status/progress
      user.watchlist[existingIndex].status = status || user.watchlist[existingIndex].status;
      if (progress !== undefined) user.watchlist[existingIndex].progress = progress;
      if (score !== undefined) user.watchlist[existingIndex].score = score;
    } else {
      // Add new
      user.watchlist.push({ 
        animeId, 
        title, 
        coverImage,
        status: status || 'Planning',
        progress: progress || 0,
        score: score || 0
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: existingIndex > -1 ? 'Watchlist updated' : 'Added to watchlist',
      watchlist: user.watchlist
    });
  } catch (error) {
    console.error("Add/Update watchlist error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove from watchlist
// @route   DELETE /watchlist/remove/:animeId
// @access  Private
exports.removeFromWatchlist = async (req, res) => {
  try {
    const { animeId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Filter out the anime
    user.watchlist = user.watchlist.filter(item => item.animeId !== String(animeId));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Removed from watchlist',
      watchlist: user.watchlist
    });
  } catch (error) {
    console.error("Remove watchlist error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Bulk import watchlist (merge or replace)
// @route   POST /watchlist/import
// @access  Private
exports.bulkImport = async (req, res) => {
  try {
    const { items, mode } = req.body; // items = [{animeId, title, coverImage, status, progress, score}], mode = "Merge" | "Replace"

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items to import' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    if (mode === "Replace") {
      // Replace: wipe existing watchlist and set new
      user.watchlist = items.map(item => ({
        animeId: String(item.animeId),
        title: item.title || `Anime ${item.animeId}`,
        coverImage: item.coverImage || '',
        status: item.status || 'Planning',
        progress: item.progress || 0,
        score: item.score || 0
      }));
      added = items.length;
    } else {
      // Merge: add new, update existing
      for (const item of items) {
        const existingIndex = user.watchlist.findIndex(w => String(w.animeId) === String(item.animeId));

        if (existingIndex > -1) {
          // Update existing entry with incoming data (don't overwrite with empty values)
          const existing = user.watchlist[existingIndex];
          if (item.status) existing.status = item.status;
          if (item.progress !== undefined && item.progress > existing.progress) existing.progress = item.progress;
          if (item.score !== undefined && item.score > 0) existing.score = item.score;
          if (item.title) existing.title = item.title;
          if (item.coverImage) existing.coverImage = item.coverImage;
          updated++;
        } else {
          user.watchlist.push({
            animeId: String(item.animeId),
            title: item.title || `Anime ${item.animeId}`,
            coverImage: item.coverImage || '',
            status: item.status || 'Planning',
            progress: item.progress || 0,
            score: item.score || 0
          });
          added++;
        }
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Import complete. ${added} added, ${updated} updated, ${skipped} skipped.`,
      watchlist: user.watchlist,
      stats: { added, updated, skipped, total: user.watchlist.length }
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
