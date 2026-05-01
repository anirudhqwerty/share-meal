import api from './api';

export const donationsService = {
  async create(payload: {
    food_type: string;
    quantity: string;
    image_path?: string;
    latitude: number;
    longitude: number;
    expiry_time: string;
  }) {
    const res = await api.post('/api/donations', payload);
    return res.data.donation;
  },

  async getMyDonations() {
    const res = await api.get('/api/donations');
    return res.data.donations;
  },

  async getNearby(lat: number, lng: number, radius = 5) {
    const res = await api.get('/api/donations', { params: { lat, lng, radius } });
    return res.data.donations;
  },

  async getById(id: string) {
    const res = await api.get(`/api/donations/${id}`);
    return res.data; // { donation, requests }
  },

  async expire(id: string) {
    const res = await api.patch(`/api/donations/${id}/expire`);
    return res.data;
  },
};
