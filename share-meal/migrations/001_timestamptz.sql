-- Migration 001 — Move timezone-naive TIMESTAMP columns to TIMESTAMPTZ.
-- Run this in the Supabase SQL editor. Idempotent-safe: re-running after
-- migration will error harmlessly on "already TIMESTAMPTZ" — that's expected.
--
-- WHY: the app stores UTC ISO strings (…Z). TIMESTAMP (without tz) strips
-- the offset and causes client-side `new Date(str)` to interpret the value
-- as local time, which in IST silently shifts everything 5.5h into the
-- past ("already expired" bug).

BEGIN;

-- Users
ALTER TABLE app_users
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- Donations
ALTER TABLE food_donations
  ALTER COLUMN expiry_time TYPE TIMESTAMPTZ USING expiry_time AT TIME ZONE 'UTC',
  ALTER COLUMN created_at  TYPE TIMESTAMPTZ USING created_at  AT TIME ZONE 'UTC';

-- Pickup requests
ALTER TABLE pickup_requests
  ALTER COLUMN request_time TYPE TIMESTAMPTZ USING request_time AT TIME ZONE 'UTC';

-- Pickups
ALTER TABLE pickups
  ALTER COLUMN scheduled_time TYPE TIMESTAMPTZ USING scheduled_time AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at   TYPE TIMESTAMPTZ USING completed_at   AT TIME ZONE 'UTC';

-- Notifications
ALTER TABLE notifications
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- Recreate the geo-search function so its return types match the new column types.
DROP FUNCTION IF EXISTS get_nearby_donations(FLOAT, FLOAT, FLOAT);
CREATE OR REPLACE FUNCTION get_nearby_donations(p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT DEFAULT 5)
RETURNS TABLE (
    id UUID,
    food_type TEXT,
    quantity VARCHAR,
    address TEXT,
    image_path VARCHAR,
    latitude DECIMAL,
    longitude DECIMAL,
    expiry_time TIMESTAMPTZ,
    status donation_status,
    created_at TIMESTAMPTZ,
    distance_km FLOAT,
    organization_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fd.id, fd.food_type, fd.quantity, fd.address, fd.image_path,
        fd.latitude, fd.longitude, fd.expiry_time, fd.status, fd.created_at,
        (ST_Distance(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000)::FLOAT as distance_km,
        d.organization_name
    FROM food_donations fd
    JOIN donors d ON fd.donor_id = d.user_id
    WHERE fd.status = 'available'
      AND ST_DWithin(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

COMMIT;
