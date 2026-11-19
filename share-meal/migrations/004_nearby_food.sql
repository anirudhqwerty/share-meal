BEGIN;
DROP FUNCTION IF EXISTS public.get_nearby_donations(FLOAT, FLOAT, FLOAT);
CREATE FUNCTION public.get_nearby_donations(p_lat FLOAT, p_lng FLOAT, p_radius_km FLOAT DEFAULT 5)
RETURNS TABLE (
  id UUID, food_type TEXT, quantity VARCHAR, address TEXT, image_path TEXT,
  latitude DECIMAL, longitude DECIMAL, expiry_time TIMESTAMPTZ,
  status donation_status, created_at TIMESTAMPTZ, distance_km FLOAT, organization_name VARCHAR
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT fd.id, fd.food_type, fd.quantity, fd.address, fd.image_path,
    fd.latitude, fd.longitude, fd.expiry_time, fd.status, fd.created_at,
    (ST_Distance(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY) / 1000)::FLOAT,
    d.organization_name
  FROM food_donations fd JOIN donors d ON d.user_id = fd.donor_id
  WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
    AND p_radius_km > 0 AND p_radius_km <= 100
    AND fd.status IN ('available', 'pending') AND fd.expiry_time > NOW()
    AND ST_DWithin(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY, p_radius_km * 1000)
  ORDER BY ST_Distance(fd.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY);
$$;
REVOKE EXECUTE ON FUNCTION public.get_nearby_donations(FLOAT, FLOAT, FLOAT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_donations(FLOAT, FLOAT, FLOAT) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
