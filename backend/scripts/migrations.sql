-- Run after schema.sql on new databases, or directly on databases created
-- with an older Share-Meal schema.

-- Add push-token storage to databases created before push notifications were added.
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

-- Restrict image uploads to a folder named after the authenticated user id.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT
  USING (bucket_id = 'food_images');
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'food_images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Function: get nearby available donations for NGO
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
  SELECT
    fd.id, fd.food_type, fd.quantity, fd.address, fd.image_path,
    fd.latitude, fd.longitude, fd.expiry_time, fd.status, fd.created_at,
    ROUND((ST_Distance(
      fd.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    ) / 1000)::NUMERIC, 2)::FLOAT AS distance_km,
    d.organization_name
  FROM food_donations fd
  JOIN donors d ON fd.donor_id = d.user_id
  WHERE
    fd.status IN ('available', 'pending')
    AND ST_DWithin(
      fd.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC;
$$ LANGUAGE sql STABLE;

-- Function: get nearby NGOs for notifying when a donation is posted
DROP FUNCTION IF EXISTS get_nearby_ngos(FLOAT, FLOAT);

CREATE OR REPLACE FUNCTION get_nearby_ngos(p_lat FLOAT, p_lng FLOAT)
RETURNS TABLE (user_id UUID, ngo_name VARCHAR, expo_push_token VARCHAR) AS $$
  SELECT
    n.user_id, n.ngo_name, u.expo_push_token
  FROM ngos n
  JOIN app_users u ON u.id = n.user_id
  WHERE
    ST_DWithin(
      n.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      n.notification_radius_km * 1000
    );
$$ LANGUAGE sql STABLE;

-- Auto-expire donations past their expiry_time (run as cron or on-demand)
CREATE OR REPLACE FUNCTION expire_old_donations()
RETURNS void AS $$
  UPDATE food_donations
  SET status = 'expired'
  WHERE status IN ('available', 'pending') AND expiry_time < NOW();
$$ LANGUAGE sql;
