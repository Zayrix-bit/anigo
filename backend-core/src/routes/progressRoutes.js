/* eslint-disable no-undef */
const express = require('express');
const { getProgress, saveProgress, deleteProgress } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All progress routes require authentication

router.route('/')
  .get(getProgress);

router.route('/save')
  .post(saveProgress);

router.route('/remove/:animeId')
  .delete(deleteProgress);

module.exports = router;
