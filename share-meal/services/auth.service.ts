import { supabase } from '@/lib/supabase';
import api from './api';

export const authService = {
  // Step 1 — send OTP
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  },

  // Step 2 — verify OTP, returns session
  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
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
