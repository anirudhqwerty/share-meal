import axios from 'axios';
import { getSupabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase JWT on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await getSupabase().auth.getSession();
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
    const apiError = new Error(msg) as Error & { status?: number; code?: string };
    apiError.name = 'ApiError';
    apiError.status = err.response?.status;
    apiError.code = err.code;
    return Promise.reject(apiError);
  }
);

export default api;
