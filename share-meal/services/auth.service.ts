import { getSupabase } from '@/lib/supabase';
import api from './api';

export const authService = {
  async signUpWithPassword(email: string, password: string, role: 'donor' | 'ngo') {
    const { data, error } = await getSupabase().auth.signUp({ email, password, options: { data: { preferred_role: role } } });
    if (error) throw new Error(error.message);
    return data;
  },

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  // Step 3 — register profile on backend
  async registerProfile(payload: {
    role: 'donor' | 'ngo';
    phone?: string;
    organizationData: Record<string, any>;
  }) {
    const res = await api.post('/api/auth/register', payload);
    return res.data;
  },

  async getMe() {
    const res = await api.get('/api/auth/me');
    return res.data;
  },

  async updateRadius(notification_radius_km: number) {
    const res = await api.patch('/api/auth/preferences', { notification_radius_km });
    return res.data.profile;
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut({ scope: 'local' });
    if (error) throw error;
  },

  async updatePushToken(expo_push_token: string | null) {
    await api.patch('/api/auth/push-token', { expo_push_token });
  },
};
