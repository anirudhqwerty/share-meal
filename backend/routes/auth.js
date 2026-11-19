const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const { authenticateToken } = require('../middleware/auth');
const { isCoordinate, isText, workflowError } = require('../lib/validation');

// POST /api/auth/register — create app_user + donor/ngo profile after Supabase OTP login
router.post('/register', authenticateToken, async (req, res) => {
  const { role, phone, organizationData } = req.body;
  const userId = req.user.id;
  const email = req.user.email;

  if (!['donor', 'ngo'].includes(role)) {
    return res.status(400).json({ error: 'Role must be donor or ngo' });
  }

  try {
    if (!organizationData || typeof organizationData !== 'object' || Array.isArray(organizationData)) {
      return res.status(400).json({ error: 'organizationData is required' });
    }

    const { data: existingUser, error: existingUserError } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (existingUserError) return res.status(400).json({ error: existingUserError.message });
    if (existingUser && existingUser.role !== role) {
      return res.status(409).json({ error: 'An account cannot change its registered role' });
    }

    const { latitude, longitude, address } = organizationData;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !isText(address, 2000) ||
      !isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)
    ) return res.status(400).json({ error: 'A valid address and map location are required' });

    if (phone != null && (typeof phone !== 'string' || phone.length > 20)) {
      return res.status(400).json({ error: 'Phone number must be at most 20 characters' });
    }
    if (role === 'donor' && !isText(organizationData.organization_name, 255)) {
      return res.status(400).json({ error: 'Organization name is required' });
    }
    if (role === 'ngo') {
      const radius = organizationData.notification_radius_km === undefined ? 5 : Number(organizationData.notification_radius_km);
      if (!isText(organizationData.ngo_name, 255)) {
        return res.status(400).json({ error: 'NGO name is required' });
      }
      if (!isText(organizationData.registration_number, 100)) {
        return res.status(400).json({ error: 'Registration number is required' });
      }
      if (!Number.isInteger(radius) || radius < 1 || radius > 100) {
        return res.status(400).json({ error: 'Notification radius must be between 1 and 100 km' });
      }
    }

    const { error: registrationError } = await supabase.rpc('register_food_profile', {
      p_user_id: userId, p_email: email, p_role: role, p_phone: phone || null,
      p_profile: { ...organizationData, latitude: lat, longitude: lng },
    });
    if (registrationError) return workflowError(res, registrationError);

    res.json({ success: true, userId, role });
  } catch (err) {
    const message = err?.message || 'Server error during registration';
    res.status(500).json({ error: message });
  }
});

// GET /api/auth/me — get full profile for current user
router.patch('/preferences', authenticateToken, async (req, res) => {
  if (req.userRole !== 'ngo') return res.status(403).json({ error: 'NGOs only' });
  const radius = req.body.notification_radius_km;
  if (!Number.isInteger(radius) || radius < 1 || radius > 100) {
    return res.status(400).json({ error: 'Radius must be a whole number from 1 to 100 km' });
  }
  const { data, error } = await supabase.from('ngos').update({ notification_radius_km: radius })
    .eq('user_id', req.user.id).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not save your radius. Please try again.' });
  if (!data) return res.status(404).json({ error: 'Complete your NGO profile first' });
  res.json({ profile: data });
});

router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  const { data: appUser, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // No app_users row yet → user hasn't finished registration. Tell client so it routes to /register.
  if (error) return res.status(500).json({ error: 'Could not load account profile' });
  if (!appUser) {
    return res.status(404).json({ error: 'Profile not created yet' });
  }

  let profile = null;
  let profileError = null;
  if (appUser.role === 'donor') {
    const { data, error: queryError } = await supabase.from('donors').select('*').eq('user_id', userId).maybeSingle();
    profile = data || null;
    profileError = queryError;
  } else if (appUser.role === 'ngo') {
    const { data, error: queryError } = await supabase.from('ngos').select('*').eq('user_id', userId).maybeSingle();
    profile = data || null;
    profileError = queryError;
  }

  if (profileError) return res.status(500).json({ error: 'Could not load organization profile' });
  res.json({ user: appUser, profile, registrationComplete: Boolean(profile) });
});

// PATCH /api/auth/push-token — update expo push token
router.patch('/push-token', authenticateToken, async (req, res) => {
  const suppliedToken = req.body?.expo_push_token;
  const expo_push_token = suppliedToken === null || suppliedToken === '' ? null : suppliedToken;
  if (expo_push_token !== null && (
    typeof expo_push_token !== 'string' ||
    !/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(expo_push_token)
  )) return res.status(400).json({ error: 'A valid Expo push token or null is required' });

  const { data, error } = await supabase
    .from('app_users')
    .update({ expo_push_token })
    .eq('id', req.user.id)
    .select('id')
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Profile not created yet' });
  res.json({ success: true });
});

module.exports = router;
