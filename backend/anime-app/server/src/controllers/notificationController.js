const Notification = require('../models/Notification');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/read/:id
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear
// @access  Private
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Notifications cleared'
    });
  } catch (error) {
    console.error("Clear notifications error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
