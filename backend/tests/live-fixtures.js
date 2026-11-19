// Explicit, temporary fixtures for device verification. Never run on startup.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { supabase } = require('../lib/supabase');
const file = path.join(os.tmpdir(), 'share-meal-device-verification.json');

async function checked(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
}
async function main() {
  if (process.argv[2] === 'cleanup') {
    if (!fs.existsSync(file)) return;
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const account of state.accounts || []) {
      await checked(supabase.from('app_users').delete().eq('id', account.id));
      await checked(supabase.auth.admin.deleteUser(account.id));
    }
    fs.unlinkSync(file);
    console.log('Temporary verification accounts and their records removed.');
    return;
  }
  if (fs.existsSync(file)) throw new Error('Verification fixtures already exist. Clean them up before creating more.');
  const run = crypto.randomUUID().slice(0, 8);
  const state = { accounts: [], donationId: null };
  fs.writeFileSync(file, JSON.stringify(state));
  for (const role of ['donor', 'ngo']) {
    const email = `device-${role}-${run}@example.test`;
    const password = crypto.randomBytes(24).toString('base64url');
    const { user } = await checked(supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { preferred_role: role } }));
    state.accounts.push({ id: user.id, role, email, password });
    fs.writeFileSync(file, JSON.stringify(state));
    await checked(supabase.from('app_users').insert({ id: user.id, role, email }));
    const base = { user_id: user.id, address: 'Patiala, Punjab', latitude: 30.3398, longitude: 76.3869 };
    await checked(role === 'donor'
      ? supabase.from('donors').insert({ ...base, organization_name: 'Share Meal Quality Checks' })
      : supabase.from('ngos').insert({ ...base, ngo_name: 'Share Meal Quality Checks', registration_number: `verification-${run}`, notification_radius_km: 5 }));
  }
  // Direct insert deliberately avoids broadcasting test food to real NGOs.
  const [listing] = await checked(supabase.from('food_donations').insert({
    donor_id: state.accounts[0].id, food_type: 'Vegetable rice', quantity: '12 portions',
    address: 'Patiala, Punjab', latitude: 30.344, longitude: 76.39,
    expiry_time: new Date(Date.now() + 6 * 3600000).toISOString(),
  }).select('id'));
  state.donationId = listing.id;
  fs.writeFileSync(file, JSON.stringify(state));
  console.log(JSON.stringify({ fixtureFile: file, accounts: state.accounts.length, donationCreated: true }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
