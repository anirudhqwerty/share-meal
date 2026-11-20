const { supabase } = require('./supabase');

async function expireDonations() {
  const { error } = await supabase.rpc('expire_old_donations');
  if (error) throw error;
}

module.exports = { expireDonations };
