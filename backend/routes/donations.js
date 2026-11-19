const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { deliverSafely } = require('../lib/push-notifications');
const { isCoordinate, isText, isUuid, workflowError } = require('../lib/validation');

router.param('id', (req, res, next, id) => {
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid donation ID' });
  next();
});

// POST /api/donations — donor creates a new food donation
router.post('/', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  const { food_type, quantity, address, image_path, latitude, longitude, expiry_time } = req.body;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const expiryDate = new Date(expiry_time);
  if (
    !isText(food_type, 500) || !isText(quantity, 100) ||
    !isCoordinate(latitude, 90) || !isCoordinate(longitude, 180) ||
    (address != null && (typeof address !== 'string' || address.length > 2000)) ||
    (image_path && (typeof image_path !== 'string' || image_path.length > 2048 || !/^https?:\/\//i.test(image_path))) ||
    !expiry_time || !Number.isFinite(expiryDate.getTime()) || expiryDate <= new Date()
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase.rpc('create_food_donation', {
    p_user_id: req.user.id,
    p_donation: { food_type: food_type.trim(), quantity: quantity.trim(), address, image_path, latitude: lat, longitude: lng, expiry_time: expiryDate.toISOString() },
  });

  if (error) return res.status(400).json({ error: error.message });

  await deliverSafely({ donationId: data.id });

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

  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'An NGO profile is required' });

  // NGO — geo query
  const { lat, lng, radius } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const radiusKm = radius === undefined ? 5 : Number(radius);
  if (
    !isCoordinate(lat, 90) || !isCoordinate(lng, 180) ||
    !Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 100
  ) return res.status(400).json({ error: 'Valid lat, lng and radius (0-100 km) are required for NGO' });

  const { data, error } = await supabase.rpc('get_nearby_donations', {
    p_lat: latitude,
    p_lng: longitude,
    p_radius_km: radiusKm,
  });

  if (error) return res.status(400).json({ error: error.message });
  const activeDonations = (data || []).filter((donation) => {
    const expiresAt = new Date(donation.expiry_time).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  });
  res.json({ donations: activeDonations });
});

// GET /api/donations/:id — full details + pickup requests
router.get('/:id', async (req, res) => {
  if (!['donor', 'ngo'].includes(req.userRole)) {
    return res.status(403).json({ error: 'A donor or NGO profile is required' });
  }

  let donationQuery = supabase
    .from('food_donations')
    .select(`*, donors(organization_name, address, latitude, longitude)`)
    .eq('id', req.params.id);

  if (req.userRole === 'donor') donationQuery = donationQuery.eq('donor_id', req.user.id);
  const { data: donation, error } = await donationQuery.maybeSingle();

  if (error || !donation) return res.status(404).json({ error: 'Donation not found' });

  if (req.userRole === 'ngo' && !['available', 'pending'].includes(donation.status)) {
    const { data: ownRequest, error: ownRequestError } = await supabase
      .from('pickup_requests')
      .select('id')
      .eq('donation_id', donation.id)
      .eq('ngo_id', req.user.id)
      .maybeSingle();
    if (ownRequestError) return res.status(400).json({ error: ownRequestError.message });
    if (!ownRequest) return res.status(404).json({ error: 'Donation not found' });
  }

  let requestQuery = supabase
    .from('pickup_requests')
    .select(req.userRole === 'donor'
      ? `*, pickups(*), ngos(ngo_name, address, latitude, longitude)`
      : '*, pickups(*)')
    .eq('donation_id', req.params.id)
    .order('request_time', { ascending: true });
  if (req.userRole === 'ngo') requestQuery = requestQuery.eq('ngo_id', req.user.id);
  const { data: requests, error: requestError } = await requestQuery;
  if (requestError) return res.status(400).json({ error: requestError.message });

  res.json({ donation, requests: requests || [] });
});

// PATCH /api/donations/:id/expire — donor marks a donation expired
router.patch('/:id/expire', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  const { data, error } = await supabase.rpc('change_food_workflow', {
    p_action: 'expire', p_id: req.params.id, p_user_id: req.user.id,
  });
  if (error) return workflowError(res, error);
  await deliverSafely({ donationId: req.params.id });
  res.json(data);
});

module.exports = router;
