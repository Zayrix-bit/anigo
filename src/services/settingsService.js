import { backendApi } from './api';

export async function getSettings() {
  try {
    const res = await backendApi.get('/settings');
    return res.data;
  } catch (error) {
    console.error("Get settings error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error fetching settings' };
  }
}

export async function updateSettings(settingsData) {
  try {
    const res = await backendApi.put('/settings', settingsData);
    return res.data;
  } catch (error) {
    console.error("Update settings error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error updating settings' };
  }
}
