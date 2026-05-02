import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase JWT on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const rawError = err.response?.data?.error;
    const msg =
      typeof rawError === 'string'
        ? rawError
        : rawError?.message || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

export default api;
