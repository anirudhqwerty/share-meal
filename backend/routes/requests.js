const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// POST /api/requests — NGO requests pickup of a donation
router.post('/', async (req, res) => {
  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'NGOs only' });

  const { donation_id } = req.body;
  if (!donation_id) return res.status(400).json({ error: 'donation_id required' });

  // Ensure donation is still available
  const { data: donation } = await supabase
    .from('food_donations')
    .select('status, donor_id, food_type')
    .eq('id', donation_id)
    .single();

  if (!donation || donation.status !== 'available') {
    return res.status(400).json({ error: 'Donation is not available' });
  }

  const { data, error } = await supabase
    .from('pickup_requests')
    .insert({ donation_id, ngo_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Mark donation as pending
  await supabase.from('food_donations').update({ status: 'pending' }).eq('id', donation_id);

  // Notify donor
  const { data: ngoProfile } = await supabase.from('ngos').select('ngo_name').eq('user_id', req.user.id).single();
  await supabase.from('notifications').insert({
    user_id: donation.donor_id,
    title: '📦 New Pickup Request!',
    message: `${ngoProfile?.ngo_name || 'An NGO'} has requested to pick up your "${donation.food_type}" listing.`,
  });

  res.status(201).json({ request: data });
});

// GET /api/requests/mine — NGO's own requests with donation details
router.get('/mine', async (req, res) => {
  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'NGOs only' });

  const { data, error } = await supabase
    .from('pickup_requests')
    .select(`*, food_donations(food_type, quantity, expiry_time, status, image_path, latitude, longitude, donors(organization_name, address, latitude, longitude))`)
    .eq('ngo_id', req.user.id)
    .order('request_time', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json({ requests: data });
});

// PATCH /api/requests/:id/approve — donor approves one request, rejects others for that donation
router.patch('/:id/approve', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  // Fetch the request
  const { data: request } = await supabase
    .from('pickup_requests')
    .select('*, food_donations(donor_id, food_type)')
    .eq('id', req.params.id)
    .single();

  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.food_donations.donor_id !== req.user.id) return res.status(403).json({ error: 'Not your donation' });

  const donationId = request.donation_id;

  // Approve this request
  await supabase.from('pickup_requests').update({ status: 'approved' }).eq('id', req.params.id);

  // Reject all other pending requests for same donation
  await supabase
    .from('pickup_requests')
    .update({ status: 'rejected' })
    .eq('donation_id', donationId)
    .neq('id', req.params.id);

  // Mark donation as claimed
  await supabase.from('food_donations').update({ status: 'claimed' }).eq('id', donationId);

  // Create pickup record
  const { data: pickup } = await supabase
    .from('pickups')
    .insert({ request_id: req.params.id, scheduled_time: req.body.scheduled_time || null })
    .select()
    .single();

  // Notify approved NGO
  await supabase.from('notifications').insert({
    user_id: request.ngo_id,
    title: '✅ Pickup Approved!',
    message: `Your request for "${request.food_donations.food_type}" has been approved! Please proceed for pickup.`,
  });

  res.json({ success: true, pickup });
});

// PATCH /api/requests/:id/reject — donor rejects a specific request
router.patch('/:id/reject', async (req, res) => {
  if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });

  const { data: request } = await supabase
    .from('pickup_requests')
    .select('ngo_id, food_donations(donor_id, food_type)')
    .eq('id', req.params.id)
    .single();

  if (!request || request.food_donations.donor_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  await supabase.from('pickup_requests').update({ status: 'rejected' }).eq('id', req.params.id);

  // Notify rejected NGO
  await supabase.from('notifications').insert({
    user_id: request.ngo_id,
    title: '❌ Pickup Request Rejected',
    message: `Your request for "${request.food_donations.food_type}" was not selected this time.`,
  });

  res.json({ success: true });
});

module.exports = router;
