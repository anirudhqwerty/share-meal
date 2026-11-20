import api from './api';

export const notificationsService = {
  async getPage(cursor?: string | null) {
    return (await api.get('/api/notifications', { params: cursor ? { cursor } : undefined })).data;
  },
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
