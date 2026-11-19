const { supabase } = require('../lib/supabase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = typeof authHeader === 'string' ? /^Bearer\s+(\S+)$/i.exec(authHeader)?.[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = user;

    // Attach role from app_users
    const { data: appUser, error: profileError } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) return res.status(503).json({ error: 'Could not verify your account. Please try again.' });

    req.userRole = appUser?.role ?? null;
    next();
  } catch (err) {
    return res.status(503).json({ error: 'Account verification is unavailable. Please try again.' });
  }
};

module.exports = { authenticateToken };
