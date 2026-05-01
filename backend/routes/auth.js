const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register — create app_user + donor/ngo profile after Supabase OTP login
router.post('/register', authenticateToken, async (req, res) => {
  const { role, phone, organizationData } = req.body;
  const userId = req.user.id;
  const email = req.user.email;

  if (!['donor', 'ngo'].includes(role)) {
    return res.status(400).json({ error: 'Role must be donor or ngo' });
  }

  try {
    // Upsert into app_users
    const { error: userError } = await supabase
      .from('app_users')
      .upsert({ id: userId, role, email, phone }, { onConflict: 'id' });

    if (userError) return res.status(400).json({ error: userError.message });

    // Create role-specific profile
    if (role === 'donor') {
      const { organization_name, address, latitude, longitude } = organizationData;
      const { error } = await supabase
        .from('donors')
        .upsert({ user_id: userId, organization_name, address, latitude, longitude }, { onConflict: 'user_id' });
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { ngo_name, registration_number, address, latitude, longitude, notification_radius_km } = organizationData;
      const { error } = await supabase
        .from('ngos')
        .upsert({ user_id: userId, ngo_name, registration_number, address, latitude, longitude, notification_radius_km: notification_radius_km || 5 }, { onConflict: 'user_id' });
      if (error) return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, userId, role });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// GET /api/auth/me — get full profile for current user
router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  if (appUser.role === 'donor') {
    const { data } = await supabase.from('donors').select('*').eq('user_id', userId).single();
    profile = data;
  } else {
    const { data } = await supabase.from('ngos').select('*').eq('user_id', userId).single();
    profile = data;
  }

  res.json({ user: appUser, profile });
});

// PATCH /api/auth/push-token — update expo push token
router.patch('/push-token', authenticateToken, async (req, res) => {
  const { expo_push_token } = req.body;
  const { error } = await supabase
    .from('app_users')
    .update({ expo_push_token })
    .eq('id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
