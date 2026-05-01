const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET /api/pickups — get scheduled pickups for current user
router.get('/', async (req, res) => {
  let query;
  if (req.userRole === 'donor') {
    query = supabase
      .from('pickups')
      .select(`*, pickup_requests(ngo_id, donation_id, ngos(ngo_name), food_donations(food_type, quantity, expiry_time))`)
      .order('scheduled_time', { ascending: true });
  } else {
    query = supabase
      .from('pickups')
      .select(`*, pickup_requests(ngo_id, donation_id, food_donations(food_type, quantity, expiry_time, donors(organization_name, address)))`)
      .eq('pickup_requests.ngo_id', req.user.id)
      .order('scheduled_time', { ascending: true });
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ pickups: data });
});

// PATCH /api/pickups/:id/complete — mark pickup as completed
router.patch('/:id/complete', async (req, res) => {
  const { data, error } = await supabase
    .from('pickups')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ pickup: data });
});

// PATCH /api/pickups/:id/cancel
router.patch('/:id/cancel', async (req, res) => {
  const { error } = await supabase
    .from('pickups')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
