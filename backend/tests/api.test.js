const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
const donor = '10000000-0000-0000-0000-000000000001';
const ngo = '20000000-0000-0000-0000-000000000001';
const id = '30000000-0000-0000-0000-000000000001';
const fakeSupabase = {
  auth: { getUser: async (token) => ({ data: { user: ['donor', 'ngo'].includes(token) ? { id: token === 'donor' ? donor : ngo } : null }, error: null }) },
  from(table) {
    const filters = {};
    const query = {
      select() { return query; }, eq(key, value) { filters[key] = value; return query; }, order() { return query; }, limit() { return query; },
      insert() { return query; }, update() { return query; },
      maybeSingle: async () => ({ data: table === 'app_users' ? { role: filters.id === donor ? 'donor' : 'ngo' } : null, error: null }),
      single: async () => ({ data: { id }, error: null }),
      then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); },
    };
    return query;
  },
  async rpc(name, args = {}) {
    calls.push({ name, args });
    if (args.p_id === '00000000-0000-0000-0000-000000000000') return { data: null, error: { code: 'P0002', message: 'Pickup not found' } };
    return { data: { request: { id }, success: true, pickup: { id, status: 'completed' } }, error: null };
  },
};
require.cache[require.resolve('../lib/supabase')] = { exports: { supabase: fakeSupabase } };
require.cache[require.resolve('../lib/push-notifications')] = { exports: { deliverSafely: async () => {} } };
const app = require('../api');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));
const request = async (route, { role = 'donor', method = 'GET', body, raw } = {}) => {
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${role}`, 'Content-Type': 'application/json' }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  return { status: response.status, body: await response.json() };
};

test('malformed JSON, null, and array bodies return 400', async () => {
  for (const raw of ['{', 'null', '[]']) assert.equal((await request('/api/donations', { method: 'POST', raw })).status, 400);
});
test('empty mutation bodies do not throw or block bodyless actions', async () => {
  assert.equal((await request('/api/donations', { method: 'POST' })).status, 400);
  assert.equal((await request(`/api/requests/${id}/reject`, { method: 'PATCH' })).status, 200);
});
test('strict bearer authentication returns 401', async () => {
  assert.equal((await request('/api/donations', { role: 'invalid' })).status, 401);
  const response = await fetch(base + '/api/donations', { headers: { Authorization: 'Basic donor' } });
  assert.equal(response.status, 401);
});
test('coordinates do not coerce blank strings, null, booleans, or arrays to zero', async () => {
  for (const value of [null, '', ' ', false, [], {}]) {
    const result = await request('/api/donations', { method: 'POST', body: { food_type: 'Rice', quantity: '10 portions', latitude: value, longitude: 76, expiry_time: new Date(Date.now() + 3600000).toISOString() } });
    assert.equal(result.status, 400, JSON.stringify(value));
  }
  assert.equal((await request('/api/donations?lat=&lng=76', { role: 'ngo' })).status, 400);
});
test('invalid IDs and oversized quantities are rejected before database writes', async () => {
  assert.equal((await request('/api/donations/invalid')).status, 400);
  assert.equal((await request('/api/requests/invalid/approve', { method: 'PATCH' })).status, 400);
  assert.equal((await request('/api/donations', { method: 'POST', body: { food_type: 'Rice', quantity: 'x'.repeat(101), latitude: 30, longitude: 76, expiry_time: new Date(Date.now() + 3600000).toISOString() } })).status, 400);
});
test('role gates and schedule validation run before workflow mutations', async () => {
  const previous = calls.length;
  assert.equal((await request(`/api/requests/${id}/approve`, { role: 'ngo', method: 'PATCH' })).status, 403);
  assert.equal((await request(`/api/requests/${id}/approve`, { method: 'PATCH', body: { scheduled_time: 'invalid' } })).status, 400);
  assert.equal((await request('/api/requests', { method: 'POST', body: { donation_id: id } })).status, 403);
  assert.equal(calls.length, previous);
});
test('pickup route sends verified user ID to atomic workflow', async () => {
  assert.equal((await request(`/api/pickups/${id}/complete`, { method: 'PATCH', role: 'ngo' })).status, 200);
  assert.deepEqual(calls.at(-1), { name: 'change_food_workflow', args: { p_action: 'complete', p_id: id, p_user_id: ngo } });
  assert.equal((await request('/api/pickups/00000000-0000-0000-0000-000000000000/cancel', { method: 'PATCH' })).status, 404);
});
test('radius preference requires NGO and integer in range', async () => {
  assert.equal((await request('/api/auth/preferences', { method: 'PATCH', body: { notification_radius_km: 5 } })).status, 403);
  for (const value of [0, 101, 1.5, null, '5']) assert.equal((await request('/api/auth/preferences', { role: 'ngo', method: 'PATCH', body: { notification_radius_km: value } })).status, 400);
});
