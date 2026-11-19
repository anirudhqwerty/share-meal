-- Migration 001 — Move timezone-naive TIMESTAMP columns to TIMESTAMPTZ.
-- Run this in the Supabase SQL editor. The type check makes repeat runs safe.
--
-- WHY: the app stores UTC ISO strings (…Z). TIMESTAMP (without tz) strips
-- the offset and causes client-side `new Date(str)` to interpret the value
-- as local time, which in IST silently shifts everything 5.5h into the
-- past ("already expired" bug).

BEGIN;

DO $$
DECLARE
  column_to_migrate RECORD;
BEGIN
  FOR column_to_migrate IN
    SELECT expected.table_name, expected.column_name
    FROM (VALUES
      ('app_users', 'created_at'),
      ('food_donations', 'expiry_time'),
      ('food_donations', 'created_at'),
      ('pickup_requests', 'request_time'),
      ('pickups', 'scheduled_time'),
      ('pickups', 'completed_at'),
      ('notifications', 'created_at')
    ) AS expected(table_name, column_name)
    JOIN information_schema.columns actual
      ON actual.table_schema = 'public'
     AND actual.table_name = expected.table_name
     AND actual.column_name = expected.column_name
     AND actual.data_type = 'timestamp without time zone'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE %L',
      column_to_migrate.table_name,
      column_to_migrate.column_name,
      column_to_migrate.column_name,
      'UTC'
    );
  END LOOP;
END $$;

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
    WHERE fd.status IN ('available', 'pending')
      AND ST_DWithin(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

COMMIT;
