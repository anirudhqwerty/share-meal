const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { isUuid, workflowError } = require('../lib/validation');
const { deliverSafely } = require('../lib/push-notifications');

router.param('id', (req, res, next, id) => {
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid pickup ID' });
  next();
});

router.get('/', async (req, res) => {
  if (!['donor', 'ngo'].includes(req.userRole)) return res.status(403).json({ error: 'Complete your profile first' });
  const ownerColumn = req.userRole === 'donor' ? 'pickup_requests.food_donations.donor_id' : 'pickup_requests.ngo_id';
  const { data, error } = await supabase.from('pickups')
    .select('*, pickup_requests!inner(ngo_id, donation_id, ngos(ngo_name), food_donations!inner(donor_id, food_type, quantity, expiry_time, donors(organization_name, address)))')
    .eq(ownerColumn, req.user.id).order('scheduled_time', { ascending: true });
  if (error) return res.status(500).json({ error: 'Could not load your pickups' });
  res.json({ pickups: data });
});

for (const action of ['complete', 'cancel']) {
  router.patch(`/:id/${action}`, async (req, res) => {
    const { data, error } = await supabase.rpc('change_food_workflow', {
      p_action: action, p_id: req.params.id, p_user_id: req.user.id,
    });
    if (error) return workflowError(res, error);
    await deliverSafely({ donationId: data.donation_id });
    res.json(data);
  });
}

module.exports = router;
