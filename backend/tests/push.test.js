const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
let notifications, users, sends;
const originalFetch = global.fetch;
const token = 'ExpoPushToken[verification-device]';
const fake = {
  from(table) {
    let patch, single = false;
    const filters = [];
    const run = () => {
      const records = table === 'notifications' ? notifications : users;
      const rows = records.filter((row) => filters.every((filter) => filter(row)));
      if (patch) rows.forEach((row) => Object.assign(row, patch));
      const data = rows.map((row) => ({ ...row, ...(table === 'notifications' ? { app_users: users.find((user) => user.id === row.user_id) } : {}) }));
      return { data: single ? data[0] || null : data, error: null };
    };
    const query = {
      select() { return query; }, update(value) { patch = value; return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      lt(key, value) { filters.push((row) => row[key] < value); return query; },
      limit() { return query; }, order() { return query; },
      async maybeSingle() { single = true; return run(); },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return query;
  },
};
require.cache[require.resolve('../lib/supabase')] = { exports: { supabase: fake } };
const { deliverNotifications, reconcileReceipts } = require('../lib/push-notifications');
beforeEach(() => {
  users = [{ id: 'user-one', expo_push_token: token }];
  notifications = [{ id: 'notice-one', user_id: 'user-one', donation_id: 'food-one', title: 'Pickup approved', message: 'Collect food.', push_status: 'pending', push_attempts: 0 }];
  sends = [];
  global.fetch = async (url, options) => {
    sends.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'ticket-one' }] }) };
  };
});
after(() => { global.fetch = originalFetch; });

test('push includes Android channel and listing identity and sends once', async () => {
  await deliverNotifications({ donationId: 'food-one' });
  assert.equal(sends[0].body[0].channelId, 'share-meal');
  assert.equal(sends[0].body[0].data.donationId, 'food-one');
  assert.equal(notifications[0].push_status, 'sent');
  assert.equal(notifications[0].push_ticket_id, 'ticket-one');
  await deliverNotifications();
  assert.equal(sends.length, 1);
});
test('missing device token skips push while preserving inbox', async () => {
  users[0].expo_push_token = null;
  await deliverNotifications();
  assert.equal(notifications[0].push_status, 'skipped');
  assert.equal(notifications[0].message, 'Collect food.');
  assert.equal(sends.length, 0);
});
test('DeviceNotRegistered clears correct user id instead of undefined recipient key', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] }) });
  await deliverNotifications();
  assert.equal(users[0].expo_push_token, null);
  assert.equal(notifications[0].push_status, 'failed');
});
test('network failure is persisted and later delivery retries within limit', async () => {
  global.fetch = async () => { throw new Error('Connection interrupted'); };
  await assert.rejects(deliverNotifications(), /Connection interrupted/);
  assert.equal(notifications[0].push_status, 'failed');
  assert.equal(notifications[0].push_attempts, 1);
  notifications[0].push_attempts = 3;
  await deliverNotifications();
  assert.equal(notifications[0].push_attempts, 3);
});
test('late receipt for old token never clears replacement device token', async () => {
  notifications[0] = { ...notifications[0], push_status: 'sent', push_ticket_id: 'ticket-one', push_token: token, push_updated_at: new Date(Date.now() - 3600000).toISOString() };
  users[0].expo_push_token = 'ExpoPushToken[replacement-device]';
  global.fetch = async () => ({ ok: true, json: async () => ({ data: { 'ticket-one': { status: 'error', details: { error: 'DeviceNotRegistered' } } } }) });
  await reconcileReceipts();
  assert.equal(users[0].expo_push_token, 'ExpoPushToken[replacement-device]');
  assert.equal(notifications[0].push_status, 'failed');
});
