const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');

// GET /api/notifications
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ notifications: data });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
