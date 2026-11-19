const fs = require('node:fs');
const path = require('node:path');
require('../lib/env');

async function main() {
  const tokenFile = process.argv[2];
  const token = tokenFile ? fs.readFileSync(tokenFile, 'utf8').trim() : process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Supply a Supabase management access token through a private file or SUPABASE_ACCESS_TOKEN.');
  const project = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  const query = async (sql, readOnly = false) => {
    const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Migration API HTTP ${response.status}: ${result.message || 'Query failed'}`);
    return result;
  };
  const before = await query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('app_users','food_donations','ngos','pickups','notifications') ORDER BY table_name, ordinal_position", true);
  if (!before.some((column) => column.table_name === 'app_users')) throw new Error('Expected Share-Meal schema is missing; refusing to initialize an unknown database.');
  console.log(`Verified Share-Meal schema: ${before.length} columns inspected.`);
  const files = [
    '../../share-meal/migrations/001_timestamptz.sql',
    './migrations.sql',
    '../../share-meal/migrations/002_nearby_donations_no_expiry_filter.sql',
    '../../share-meal/migrations/003_atomic_workflows.sql',
    '../../share-meal/migrations/004_nearby_food.sql',
    '../../share-meal/migrations/005_notifications.sql',
  ];
  const sql = files.map((file) => fs.readFileSync(path.resolve(__dirname, file), 'utf8').replace(/^\s*(BEGIN|COMMIT);\s*$/gm, '')).join('\n');
  await query(`BEGIN;\n${sql}\nCOMMIT;`);
  const verification = await query(`SELECT
    (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('app_users','donors','ngos','food_donations','pickup_requests','pickups','notifications') AND rowsecurity) AS protected_tables,
    has_function_privilege('authenticated', 'public.change_food_workflow(text,uuid,uuid,timestamptz)', 'EXECUTE') AS client_can_mutate_workflow,
    (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='food_donations' AND column_name='image_path') AS image_path_type,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='food_donations' AND column_name='expiry_time' AND data_type='timestamp with time zone') AS utc_expiry_columns`, true);
  console.log('Applied migrations:', files.map((file) => path.basename(file)).join(', '));
  console.log('Verification:', JSON.stringify(verification));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
