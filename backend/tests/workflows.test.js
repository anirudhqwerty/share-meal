const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
let db;
const donor = '10000000-0000-0000-0000-000000000001';
const ngo = '20000000-0000-0000-0000-000000000001';
const otherNgo = '20000000-0000-0000-0000-000000000002';
const otherDonor = '10000000-0000-0000-0000-000000000002';
const profile = (name) => ({ organization_name: name, ngo_name: name, registration_number: name, address: 'Collection address', latitude: 30.3, longitude: 76.3, notification_radius_km: 5 });
const register = (id, role, name) => db.query('SELECT register_food_profile($1, $2, $3, NULL, $4)', [id, `${id}@example.test`, role, profile(name)]);
const workflow = async (action, id, user, time = null) => (await db.query('SELECT change_food_workflow($1, $2, $3, $4) AS result', [action, id, user, time])).rows[0].result;
const donation = async (hours = 4) => (await db.query("INSERT INTO food_donations (donor_id, food_type, quantity, latitude, longitude, expiry_time) VALUES ($1, 'Rice', '10 portions', 30.3, 76.3, NOW() + $2 * INTERVAL '1 hour') RETURNING id", [donor, hours])).rows[0].id;
const state = async (id) => (await db.query('SELECT status FROM food_donations WHERE id = $1', [id])).rows[0].status;

before(async () => {
  db = new PGlite();
  const schema = fs.readFileSync(path.join(__dirname, '../../share-meal/schema.sql'), 'utf8');
  const types = [...schema.matchAll(/CREATE TYPE[^;]+;/g)].map((match) => match[0]).join('\n');
  // PostGIS is not available in WASM. Use PostgreSQL's indexed point type for
  // the location columns; all workflow tables, constraints, and SQL are real.
  const tables = [...schema.matchAll(/CREATE TABLE [\s\S]*?\n\);/g)].map((match) => match[0].replaceAll('GEOGRAPHY(POINT, 4326)', 'POINT')).join('\n');
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ${types} ${tables}
    CREATE FUNCTION get_nearby_ngos(FLOAT, FLOAT) RETURNS VOID LANGUAGE sql AS 'SELECT';
    CREATE FUNCTION get_nearby_donations(FLOAT, FLOAT, FLOAT) RETURNS VOID LANGUAGE sql AS 'SELECT';`);
  await db.exec(fs.readFileSync(path.join(__dirname, '../../share-meal/migrations/003_atomic_workflows.sql'), 'utf8'));
  await db.exec("CREATE FUNCTION st_dwithin(POINT, POINT, FLOAT) RETURNS BOOLEAN LANGUAGE sql AS 'SELECT $1 <-> $2 <= $3 / 111000';");
  await db.exec(fs.readFileSync(path.join(__dirname, '../../share-meal/migrations/005_notifications.sql'), 'utf8'));
});
beforeEach(async () => {
  await db.exec('TRUNCATE app_users CASCADE');
  await register(donor, 'donor', 'Donor');
  await register(otherDonor, 'donor', 'Other donor');
  await register(ngo, 'ngo', 'NGO one');
  await register(otherNgo, 'ngo', 'NGO two');
});
after(async () => { await db?.close(); });

test('request, approve, and collect keep all records consistent', async () => {
  const id = await donation();
  const first = await workflow('request', id, ngo);
  const second = await workflow('request', id, otherNgo);
  assert.equal(await state(id), 'pending');
  const approved = await workflow('approve', first.request.id, donor);
  assert.equal(await state(id), 'claimed');
  assert.equal((await db.query('SELECT status FROM pickup_requests WHERE id=$1', [second.request.id])).rows[0].status, 'rejected');
  const completed = await workflow('complete', approved.pickup.id, ngo);
  assert.equal(completed.pickup.status, 'completed');
  assert.ok(completed.pickup.completed_at);
});
test('duplicate NGO requests and second approval fail without corrupting the winner', async () => {
  const id = await donation();
  const first = await workflow('request', id, ngo);
  await assert.rejects(workflow('request', id, ngo), { code: '23505' });
  const second = await workflow('request', id, otherNgo);
  await workflow('approve', first.request.id, donor);
  await assert.rejects(workflow('approve', second.request.id, donor), { code: '23514' });
  assert.equal((await db.query('SELECT count(*)::INT AS n FROM pickups')).rows[0].n, 1);
});
test('last rejection reopens food, earlier rejection leaves it pending', async () => {
  const id = await donation();
  const first = await workflow('request', id, ngo), second = await workflow('request', id, otherNgo);
  await workflow('reject', first.request.id, donor);
  assert.equal(await state(id), 'pending');
  await workflow('reject', second.request.id, donor);
  assert.equal(await state(id), 'available');
});
test('cancelling a pickup reopens unexpired food and rejects its request', async () => {
  const id = await donation();
  const request = await workflow('request', id, ngo);
  const { pickup } = await workflow('approve', request.request.id, donor);
  await workflow('cancel', pickup.id, ngo);
  assert.equal(await state(id), 'available');
  assert.equal((await db.query('SELECT status FROM pickup_requests WHERE id=$1', [request.request.id])).rows[0].status, 'rejected');
  await workflow('request', id, otherNgo);
});
test('cancelling after expiry never reopens unsafe food', async () => {
  const id = await donation();
  const request = await workflow('request', id, ngo);
  const { pickup } = await workflow('approve', request.request.id, donor);
  await db.query("UPDATE food_donations SET expiry_time = NOW() - INTERVAL '1 hour' WHERE id=$1", [id]);
  await workflow('cancel', pickup.id, donor);
  assert.equal(await state(id), 'expired');
});
test('expired food and pickup times outside safe window cannot be approved', async () => {
  const expired = await donation(-1);
  await assert.rejects(workflow('request', expired, ngo), { code: '23514' });
  const id = await donation();
  const request = await workflow('request', id, ngo);
  await assert.rejects(workflow('approve', request.request.id, donor, new Date(Date.now() + 8 * 3600000).toISOString()), { code: '22023' });
  assert.equal(await state(id), 'pending');
});
test('failed pickup insert rolls back approval and all sibling changes', async () => {
  const id = await donation();
  const request = await workflow('request', id, ngo);
  await db.exec("CREATE FUNCTION fail_pickup() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected failure'; END; $$; CREATE TRIGGER fail_pickup BEFORE INSERT ON pickups FOR EACH ROW EXECUTE FUNCTION fail_pickup();");
  try {
    await assert.rejects(workflow('approve', request.request.id, donor));
    assert.equal(await state(id), 'pending');
    assert.equal((await db.query('SELECT status FROM pickup_requests WHERE id=$1', [request.request.id])).rows[0].status, 'pending');
  } finally { await db.exec('DROP TRIGGER fail_pickup ON pickups; DROP FUNCTION fail_pickup();'); }
});
test('ownership checks block other donors and NGOs', async () => {
  const id = await donation();
  const request = await workflow('request', id, ngo);
  await assert.rejects(workflow('approve', request.request.id, otherDonor), { code: '42501' });
  await assert.rejects(workflow('expire', id, otherDonor), { code: '42501' });
  const { pickup } = await workflow('approve', request.request.id, donor);
  await assert.rejects(workflow('complete', pickup.id, otherNgo), { code: '42501' });
  await assert.rejects(workflow('cancel', pickup.id, otherDonor), { code: '42501' });
});
test('closing a listing rejects pending requests atomically', async () => {
  const id = await donation();
  const request = await workflow('request', id, ngo);
  await workflow('expire', id, donor);
  assert.equal(await state(id), 'expired');
  assert.equal((await db.query('SELECT status FROM pickup_requests WHERE id=$1', [request.request.id])).rows[0].status, 'rejected');
});
test('registration failure rolls back base account and preserves registered roles', async () => {
  const newNgo = '20000000-0000-0000-0000-000000000003';
  await assert.rejects(register(newNgo, 'ngo', 'NGO one'), { code: '23505' });
  assert.equal((await db.query('SELECT count(*)::INT AS n FROM app_users WHERE id=$1', [newNgo])).rows[0].n, 0);
  await assert.rejects(register(donor, 'ngo', 'Role switch'), { code: '23514' });
});
test('client roles cannot bypass API ownership with RPC or table writes', async () => {
  await db.exec('SET ROLE authenticated');
  try {
    await assert.rejects(db.query('SELECT change_food_workflow($1, $2, $3)', ['request', donor, ngo]), { code: '42501' });
    await assert.rejects(db.query('SELECT * FROM app_users'), { code: '42501' });
  } finally { await db.exec('RESET ROLE'); }
});
test('migration can be applied again', async () => {
  await db.exec(fs.readFileSync(path.join(__dirname, '../../share-meal/migrations/003_atomic_workflows.sql'), 'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname, '../../share-meal/migrations/005_notifications.sql'), 'utf8'));
});

test('workflow notifications persist once, including losing NGOs and collection participants', async () => {
  const id = await donation();
  const first = await workflow('request', id, ngo);
  await workflow('request', id, otherNgo);
  const { pickup } = await workflow('approve', first.request.id, donor);
  const pending = (await db.query('SELECT user_id, title, donation_id, push_status FROM notifications ORDER BY created_at')).rows;
  assert.equal(pending.length, 4);
  assert.equal(pending.filter((item) => item.title === 'New pickup request').length, 2);
  assert.ok(pending.some((item) => item.user_id === otherNgo && item.title === 'Pickup request declined'));
  assert.ok(pending.every((item) => item.donation_id === id && item.push_status === 'pending'));
  await workflow('complete', pickup.id, ngo);
  assert.equal((await db.query("SELECT count(*)::INT AS n FROM notifications WHERE title='Food collected'")).rows[0].n, 2);
});
test('notification insertion failure rolls back the request and reservation', async () => {
  const id = await donation();
  await db.exec("CREATE FUNCTION fail_notification() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected notification failure'; END; $$; CREATE TRIGGER fail_notification BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_notification();");
  try {
    await assert.rejects(workflow('request', id, ngo));
    assert.equal(await state(id), 'available');
    assert.equal((await db.query('SELECT count(*)::INT AS n FROM pickup_requests')).rows[0].n, 0);
  } finally { await db.exec('DROP TRIGGER fail_notification ON notifications; DROP FUNCTION fail_notification();'); }
});
test('legacy direct inserts do not duplicate notifications during rolling release', async () => {
  const id = await donation();
  await db.query('INSERT INTO pickup_requests (donation_id, ngo_id) VALUES ($1, $2)', [id, ngo]);
  assert.equal((await db.query('SELECT count(*)::INT AS n FROM notifications')).rows[0].n, 0);
});
