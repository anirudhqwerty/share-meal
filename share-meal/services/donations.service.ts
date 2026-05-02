import { supabase } from '@/lib/supabase';
import api from './api';

export const donationsService = {
  async create(payload: {
    food_type: string;
    quantity: string;
    image_path?: string;
    latitude: number;
    longitude: number;
    address?: string;
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

  /**
   * Uploads a local image URI to Supabase Storage and returns its public URL.
   *
   * In React Native, passing `{uri,name,type}` directly to supabase-js
   * uploads 0 bytes. We must read the file to bytes ourselves.
   */
  async uploadImage(uri: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) throw new Error('You must be signed in to upload images.');

    // Fetch the file URI and convert to ArrayBuffer (works in RN w/ expo-image-picker URIs).
    const res = await fetch(uri);
    if (!res.ok) throw new Error('Could not read the selected image file.');
    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Selected image is empty. Try picking another photo.');
    }

    const extMatch = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
    const ext = (extMatch?.[1] || 'jpg').toLowerCase();
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'webp' ? 'image/webp' :
      ext === 'heic' ? 'image/heic' :
      'image/jpeg';

    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('food_images')
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) throw new Error(`Image upload failed: ${error.message}`);

    const { data: { publicUrl } } = supabase.storage.from('food_images').getPublicUrl(fileName);
    if (!publicUrl) throw new Error('Could not resolve image URL after upload.');
    return publicUrl;
  },
};
