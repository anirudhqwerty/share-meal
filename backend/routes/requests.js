const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { deliverSafely } = require('../lib/push-notifications');
const { isUuid, workflowError } = require('../lib/validation');
const { expireDonations } = require('../lib/expiry');

router.param('id', (req, res, next, id) => {
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid request ID' });
  next();
});

router.post('/', async (req, res) => {
  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'NGOs only' });
  if (!isUuid(req.body.donation_id)) return res.status(400).json({ error: 'A valid donation_id is required' });
  const { data, error } = await supabase.rpc('change_food_workflow', {
    p_action: 'request', p_id: req.body.donation_id, p_user_id: req.user.id,
  });
  if (error) return workflowError(res, error);
  await deliverSafely({ donationId: req.body.donation_id });
  res.status(201).json({ request: data.request });
});

router.get('/mine', async (req, res) => {
  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'NGOs only' });
  await expireDonations();
  const { data, error } = await supabase.from('pickup_requests')
    .select('*, pickups(*), food_donations(food_type, quantity, address, expiry_time, status, image_path, latitude, longitude, donors(organization_name, address, latitude, longitude))')
    .eq('ngo_id', req.user.id).order('request_time', { ascending: false });
  if (error) return res.status(500).json({ error: 'Could not load your requests' });
  res.json({ requests: data });
});

for (const action of ['approve', 'reject']) {
  router.patch(`/:id/${action}`, async (req, res) => {
    if (req.userRole !== 'donor') return res.status(403).json({ error: 'Donors only' });
    const scheduled = req.body.scheduled_time;
    if (scheduled != null && (typeof scheduled !== 'string' || !Number.isFinite(new Date(scheduled).getTime()))) {
      return res.status(400).json({ error: 'A valid scheduled time is required' });
    }
    const { data, error } = await supabase.rpc('change_food_workflow', {
      p_action: action, p_id: req.params.id, p_user_id: req.user.id,
      p_scheduled_time: scheduled ? new Date(scheduled).toISOString() : null,
    });
    if (error) return workflowError(res, error);
    await deliverSafely({ donationId: data.donation_id });
    res.json({ success: true, ...(data.pickup ? { pickup: data.pickup } : {}) });
  });
}

module.exports = router;
