import api from './api';

export const pickupsService = {
  async complete(id: string) { return (await api.patch(`/api/pickups/${id}/complete`, {})).data; },
  async cancel(id: string) { return (await api.patch(`/api/pickups/${id}/cancel`, {})).data; },
};
