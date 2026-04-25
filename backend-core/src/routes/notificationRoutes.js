/* eslint-disable no-undef */
const express = require('express');
const { 
  getNotifications, 
  markAsRead, 
  markAllRead, 
  clearNotifications 
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/read/:id', markAsRead);
router.put('/read-all', markAllRead);
router.delete('/clear', clearNotifications);

module.exports = router;
