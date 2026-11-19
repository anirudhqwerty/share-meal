const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { isUuid } = require('../lib/validation');
const { deliverSafely } = require('../lib/push-notifications');

router.param('id', (req, res, next, id) => {
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid notification ID' });
  next();
});

// GET /api/notifications
router.get('/', async (req, res) => {
  await deliverSafely({ userId: req.user.id });
  let query = supabase
    .from('notifications')
    .select('id, title, message, is_read, created_at, donation_id, request_id')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(50);
  if (req.query.cursor) {
    try {
      if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 512) throw new Error();
      const cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString('utf8'));
      if (!isUuid(cursor.id) || typeof cursor.created_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(cursor.created_at) || !Number.isFinite(new Date(cursor.created_at).getTime())) throw new Error();
      const created = cursor.created_at;
      query = query.or(`created_at.lt.${created},and(created_at.eq.${created},id.lt.${cursor.id})`);
    } catch { return res.status(400).json({ error: 'Invalid notification cursor' }); }
  }
  const { data, error } = await query;

  if (error) return res.status(500).json({ error: 'Could not load notifications' });
  const last = data?.at(-1);
  const nextCursor = data?.length === 50 ? Buffer.from(JSON.stringify({ id: last.id, created_at: last.created_at })).toString('base64url') : null;
  res.json({ notifications: data, nextCursor });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('id').maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Notification not found' });
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
