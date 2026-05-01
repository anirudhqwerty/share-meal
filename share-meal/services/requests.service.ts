import api from './api';

export const requestsService = {
  async create(donation_id: string) {
    const res = await api.post('/api/requests', { donation_id });
    return res.data.request;
  },

  async getMine() {
    const res = await api.get('/api/requests/mine');
    return res.data.requests;
  },

  async approve(requestId: string, scheduled_time?: string) {
    const res = await api.patch(`/api/requests/${requestId}/approve`, { scheduled_time });
    return res.data;
  },

  async reject(requestId: string) {
    const res = await api.patch(`/api/requests/${requestId}/reject`);
    return res.data;
  },
};
