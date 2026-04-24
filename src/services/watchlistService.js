import { backendApi } from './api';

export async function getWatchlist() {
  try {
    const res = await backendApi.get('/watchlist');
    return res.data;
  } catch (error) {
    console.error("Get watchlist error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error fetching watchlist' };
  }
}

export async function addToWatchlist(animeId, title, coverImage, status = 'Planning', progress = 0, score = 0) {
  try {
    const res = await backendApi.post('/watchlist/add', {
      animeId,
      title,
      coverImage,
      status,
      progress,
      score
    });
    return res.data;
  } catch (error) {
    console.error("Add to watchlist error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error adding to watchlist' };
  }
}

export async function removeFromWatchlist(animeId) {
  try {
    const res = await backendApi.delete(`/watchlist/remove/${animeId}`);
    return res.data;
  } catch (error) {
    console.error("Remove from watchlist error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error removing from watchlist' };
  }
}
