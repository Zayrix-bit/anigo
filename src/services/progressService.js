import { backendApi } from './api';

export async function getProgress() {
  try {
    const res = await backendApi.get('/progress');
    return res.data;
  } catch (error) {
    console.error("Get progress error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error fetching progress' };
  }
}

export async function updateProgress(animeId, episode, currentTime, duration, title, coverImage) {
  try {
    const res = await backendApi.post('/progress/save', {
      animeId,
      episode,
      currentTime,
      duration,
      title,
      coverImage
    });
    return res.data;
  } catch (error) {
    console.error("Save progress error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error saving progress' };
  }
}

export async function removeProgress(animeId) {
  try {
    const res = await backendApi.delete(`/progress/remove/${animeId}`);
    return res.data;
  } catch (error) {
    console.error("Remove progress error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error removing progress' };
  }
}
