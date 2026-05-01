const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// POST /api/donations — donor creates a new food donation
router.post('/', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  const { food_type, quantity, image_path, latitude, longitude, expiry_time } = req.body;
  if (!food_type || !quantity || !latitude || !longitude || !expiry_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('food_donations')
    .insert({ donor_id: req.user.id, food_type, quantity, image_path, latitude, longitude, expiry_time })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Notify nearby NGOs (fire-and-forget)
  notifyNearbyNGOs(data, latitude, longitude).catch(console.error);

  res.status(201).json({ donation: data });
});

// GET /api/donations — donor: own donations | NGO: nearby available
router.get('/', async (req, res) => {
  if (req.userRole === 'donor') {
    const { data, error } = await supabase
      .from('food_donations')
      .select('*')
      .eq('donor_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ donations: data });
  }

  // NGO — geo query
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required for NGO' });

  const { data, error } = await supabase.rpc('get_nearby_donations', {
    p_lat: parseFloat(lat),
    p_lng: parseFloat(lng),
    p_radius_km: parseFloat(radius || 5),
  });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ donations: data });
});

// GET /api/donations/:id — full details + pickup requests
router.get('/:id', async (req, res) => {
  const { data: donation, error } = await supabase
    .from('food_donations')
    .select(`*, donors(organization_name, address, latitude, longitude)`)
    .eq('id', req.params.id)
    .single();

  if (error || !donation) return res.status(404).json({ error: 'Donation not found' });

  const { data: requests } = await supabase
    .from('pickup_requests')
    .select(`*, ngos(ngo_name, address, registration_number)`)
    .eq('donation_id', req.params.id)
    .order('request_time', { ascending: true });

  res.json({ donation, requests: requests || [] });
});

// PATCH /api/donations/:id/expire — donor marks a donation expired
router.patch('/:id/expire', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  const { error } = await supabase
    .from('food_donations')
    .update({ status: 'expired' })
    .eq('id', req.params.id)
    .eq('donor_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Helper — notify nearby NGOs when a new donation is posted
async function notifyNearbyNGOs(donation, lat, lng) {
  const { data: ngos } = await supabase.rpc('get_nearby_ngos', {
    p_lat: parseFloat(lat),
    p_lng: parseFloat(lng),
  });

  if (!ngos || ngos.length === 0) return;

  const notifications = ngos.map((ngo) => ({
    user_id: ngo.user_id,
    title: '🍲 New Food Available Nearby!',
    message: `${donation.food_type} (${donation.quantity}) is available near you. Claim it before it expires!`,
  }));

  await supabase.from('notifications').insert(notifications);
}

module.exports = router;
