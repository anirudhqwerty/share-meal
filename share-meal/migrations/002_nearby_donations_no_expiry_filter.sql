-- If you already ran 001 with `AND fd.expiry_time > NOW()` in get_nearby_donations,
-- that extra filter can hide every row after a bad timestamp migration. The app
-- already shows "time left" in the UI — we only need `status = 'available'`
-- and the distance filter here.
--
-- Run in Supabase SQL editor.

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
