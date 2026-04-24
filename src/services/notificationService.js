import { backendApi } from './api';

export async function getNotifications() {
  try {
    const res = await backendApi.get('/notifications');
    return res.data;
  } catch (error) {
    console.error("Get notifications error:", error.response?.data || error.message);
    return { success: false, message: error.response?.data?.message || 'Error fetching notifications' };
  }
}

export async function markAsRead(id) {
  try {
    const res = await backendApi.put(`/notifications/read/${id}`);
    return res.data;
  } catch (error) {
    console.error("Mark read error:", error.response?.data || error.message);
    return { success: false, message: 'Error marking notification as read' };
  }
}

export async function markAllRead() {
  try {
    const res = await backendApi.put('/notifications/read-all');
    return res.data;
  } catch (error) {
    console.error("Mark all read error:", error.response?.data || error.message);
    return { success: false, message: 'Error marking all as read' };
  }
}

export async function clearNotifications() {
  try {
    const res = await backendApi.delete('/notifications/clear');
    return res.data;
  } catch (error) {
    console.error("Clear notifications error:", error.response?.data || error.message);
    return { success: false, message: 'Error clearing notifications' };
  }
}
