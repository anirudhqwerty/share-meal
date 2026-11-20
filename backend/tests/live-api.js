const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../lib/supabase');
const app = require('../api');

async function main() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'share-meal-device-verification.json'), 'utf8'));
  const frontend = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../../share-meal/.env')));
  const tokens = {};
  for (const account of fixtures.accounts) {
    const client = createClient(frontend.EXPO_PUBLIC_SUPABASE_URL, frontend.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (error) throw error;
    tokens[account.role] = data.session.access_token;
  }
  const server = process.argv[2] ? null : app.listen(0, '127.0.0.1');
  if (server) await new Promise((resolve) => server.once('listening', resolve));
  const base = process.argv[2]?.replace(/\/$/, '') || `http://127.0.0.1:${server.address().port}`;
  const request = async (route, role, method = 'GET', body) => {
    const response = await fetch(`${base}${route}`, {
      method, headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.ok(response.ok, `${method} ${route}: ${response.status} ${data.error || ''}`);
    return data;
  };
  try {
    const nearby = await request('/api/donations?lat=30.3398&lng=76.3869&radius=5', 'ngo');
    assert.ok(nearby.donations.some((item) => item.id === fixtures.donationId));
    const narrow = await request('/api/donations?lat=30.3398&lng=76.3869&radius=0.1', 'ngo');
    assert.ok(!narrow.donations.some((item) => item.id === fixtures.donationId));
    await request('/api/auth/preferences', 'ngo', 'PATCH', { notification_radius_km: 10 });
    assert.equal((await request('/api/auth/me', 'ngo')).profile.notification_radius_km, 10);
    await request('/api/auth/preferences', 'ngo', 'PATCH', { notification_radius_km: 5 });
    const { request: pickupRequest } = await request('/api/requests', 'ngo', 'POST', { donation_id: fixtures.donationId });
    let inbox = await request('/api/notifications', 'donor');
    assert.ok(inbox.notifications.some((item) => item.request_id === pickupRequest.id));
    const { pickup } = await request(`/api/requests/${pickupRequest.id}/approve`, 'donor', 'PATCH', {});
    const detail = await request(`/api/donations/${fixtures.donationId}`, 'ngo');
    assert.equal(detail.requests[0].pickups.id, pickup.id);
    await request(`/api/pickups/${pickup.id}/complete`, 'ngo', 'PATCH', {});
    inbox = await request('/api/notifications', 'ngo');
    assert.ok(inbox.notifications.some((item) => item.title === 'Food collected'));
    const notification = inbox.notifications[0];
    await request(`/api/notifications/${notification.id}/read`, 'ngo', 'PATCH', {});
    assert.ok((await request('/api/notifications', 'ngo')).notifications.find((item) => item.id === notification.id).is_read);
    await request('/api/notifications/read-all', 'ngo', 'PATCH', {});
    assert.ok((await request('/api/notifications', 'ngo')).notifications.every((item) => item.is_read));
    const { data: status, error } = await supabase.from('notifications').select('push_status').eq('donation_id', fixtures.donationId);
    if (error) throw error;
    assert.ok(status.every((item) => item.push_status === 'skipped'));
    console.log('LIVE PASS: PostGIS radius, saved preference, request, approval, pickup relation, completion, durable notifications, read/read-all, and no-token handling.');
  } finally { if (server) await new Promise((resolve) => server.close(resolve)); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
