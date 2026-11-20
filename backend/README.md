# Share-Meal API

Install with `npm ci`, then run `npm start`. Development uses `npm run dev` (Node watch mode). Node 22 or newer is recommended. Configuration loads `backend/.env.local`, then `backend/.env`; existing process variables take priority. The Supabase service key belongs only in the backend.

## Database

For a new database, apply `../share-meal/schema.sql` once. Then run the checked migration runner against the intended project:

```powershell
node scripts/migrate.js <private-token-file>
```

The private file must contain a Supabase personal access token, not an anon key or service-role JWT. `SUPABASE_ACCESS_TOKEN` is also supported. The runner identifies the project from `SUPABASE_URL`, verifies the expected tables, applies timestamp, storage, workflow, geospatial, and notification migrations in one transaction, and verifies permissions. Never commit the token file.

Business tables and mutation RPCs are restricted to the service role. API routes derive the actor from a verified Supabase JWT. Database locks serialize request creation, approval, rejection, listing closure, collection, and cancellation. Registration writes the base account and organization together.

## Notifications

New transactional RPCs create inbox notifications in the same database transaction. Legacy API versions keep their existing notification behavior during a rolling release. Push delivery is awaited with a timeout, and status, attempts, ticket ID, and errors remain in the protected database. API responses omit these internal fields.

No worker or cron is required. The API sends Android pushes directly after a food/pickup change. A later API request can retry a failed or interrupted attempt, up to three attempts total. The API records Expo's immediate acceptance/rejection; it does not poll delivery receipts or guarantee that a phone displayed the push. Inbox notifications remain saved even if push delivery fails.

Remote push requires an Android development/production build with its EAS project ID and FCM credentials. iOS and web do not register for remote push. Expo Go on Android does not support remote push. Inbox notifications work on every platform without a device token.

## Verification

`npm test` runs API validation, ownership, transactional rollback, lifecycle, notification, and push-delivery regressions. The PostgreSQL tests use PGlite with the real table definitions and migration functions. PostGIS is replaced with a point-distance shim only inside the test process; live PostGIS behavior requires a separate integration check.

`tests/live-fixtures.js` and `tests/live-api.js` are explicit device/integration tools. They create temporary verification accounts and food records, never run on app startup, and store generated credentials in the OS temporary directory. The direct fixture listing insert avoids broadcasting test food to real NGOs. Always run `node tests/live-fixtures.js cleanup` afterward.
