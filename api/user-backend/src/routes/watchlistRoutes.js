const express = require('express');
const { getWatchlist, addToWatchlist, removeFromWatchlist, bulkImport } = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All watchlist routes require authentication

router.route('/')
  .get(getWatchlist);

router.route('/add')
  .post(addToWatchlist);

router.route('/remove/:animeId')
  .delete(removeFromWatchlist);

router.route('/import')
  .post(bulkImport);

module.exports = router;
