import api from './api';

export const notificationsService = {
  async getAll() {
    const res = await api.get('/api/notifications');
    return res.data.notifications;
  },

  async markRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
  },

  async markAllRead() {
    await api.patch('/api/notifications/read-all');
  },
};
