import Constants from 'expo-constants';

const isConfiguredValue = (value: string | undefined) => {
  const normalized = value?.trim();
  return Boolean(normalized && !/^(your_|replace_|<|placeholder)/i.test(normalized));
};

const isHttpUrl = (value: string | undefined) => {
  if (!isConfiguredValue(value)) return false;

  try {
    const url = new URL(value!.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
export const isMapsConfigured = Boolean(Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY_SET);

export const isSupabaseConfigured =
  isHttpUrl(SUPABASE_URL) && isConfiguredValue(SUPABASE_ANON_KEY);

export function getMissingConfiguration(): string[] {
  const missing: string[] = [];
  if (!isHttpUrl(SUPABASE_URL)) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!isConfiguredValue(SUPABASE_ANON_KEY)) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!isHttpUrl(API_BASE_URL)) missing.push('EXPO_PUBLIC_API_URL');
  return missing;
}
