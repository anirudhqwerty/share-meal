const { supabase } = require('../lib/supabase');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;

    // Attach role from app_users
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single();

    req.userRole = appUser?.role ?? null;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

module.exports = { authenticateToken };
