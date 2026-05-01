-- Run this in your Supabase SQL Editor AFTER the main schema.sql

-- Function: get nearby available donations for NGO
CREATE OR REPLACE FUNCTION get_nearby_donations(p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT DEFAULT 5)
RETURNS TABLE (
  id UUID,
  donor_id UUID,
  food_type TEXT,
  quantity VARCHAR,
  image_path VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  expiry_time TIMESTAMP,
  status donation_status,
  created_at TIMESTAMP,
  distance_km FLOAT,
  organization_name VARCHAR,
  address TEXT
) AS $$
  SELECT
    fd.id, fd.donor_id, fd.food_type, fd.quantity, fd.image_path,
    fd.latitude, fd.longitude, fd.expiry_time, fd.status, fd.created_at,
    ROUND((ST_Distance(
      fd.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY
    ) / 1000)::NUMERIC, 2) AS distance_km,
    d.organization_name,
    d.address
  FROM food_donations fd
  JOIN donors d ON fd.donor_id = d.user_id
  WHERE
    fd.status = 'available'
    AND fd.expiry_time > NOW()
    AND ST_DWithin(
      fd.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC;
$$ LANGUAGE sql STABLE;

-- Function: get nearby NGOs for notifying when a donation is posted
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
  WHERE status = 'available' AND expiry_time < NOW();
$$ LANGUAGE sql;
