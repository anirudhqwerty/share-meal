const { createClient } = require('@supabase/supabase-js');
require('./env');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

if (!supabaseUrl || !/^https?:\/\//i.test(supabaseUrl) || !serviceKey || /^your_|^replace_|^placeholder/i.test(serviceKey)) {
  throw new Error(
    'Backend Supabase configuration is missing or invalid. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env.',
  );
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

module.exports = { supabase };
