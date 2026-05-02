import { supabase } from '@/lib/supabase';
import api from './api';

export const authService = {
  async signUpWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  async signOut() {
    await supabase.auth.signOut();
  },

  async updatePushToken(expo_push_token: string) {
    await api.patch('/api/auth/push-token', { expo_push_token });
  },
};
