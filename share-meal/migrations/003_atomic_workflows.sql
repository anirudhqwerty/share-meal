-- Apply after 001 and 002. Business writes go through the authenticated API.
BEGIN;

ALTER TABLE public.food_donations ALTER COLUMN image_path TYPE TEXT;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- No direct client table writes: the API checks the verified JWT and role.
REVOKE ALL ON public.app_users, public.donors, public.ngos, public.food_donations,
  public.pickup_requests, public.pickups, public.notifications FROM anon, authenticated;
GRANT ALL ON public.app_users, public.donors, public.ngos, public.food_donations,
  public.pickup_requests, public.pickups, public.notifications TO service_role;

CREATE INDEX IF NOT EXISTS food_donations_location_idx ON public.food_donations USING GIST (location);
CREATE INDEX IF NOT EXISTS ngos_location_idx ON public.ngos USING GIST (location);
CREATE INDEX IF NOT EXISTS food_donations_donor_idx ON public.food_donations (donor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pickup_requests_ngo_idx ON public.pickup_requests (ngo_id, request_time DESC);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.change_food_workflow(
  p_action TEXT, p_id UUID, p_user_id UUID, p_scheduled_time TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  d food_donations%ROWTYPE;
  r pickup_requests%ROWTYPE;
  p pickups%ROWTYPE;
  actor_role user_role;
  donation_id UUID;
BEGIN
  PERFORM set_config('sharemeal.atomic_notifications', 'on', TRUE);
  SELECT role INTO actor_role FROM app_users WHERE id = p_user_id;
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Complete your profile first' USING ERRCODE = '42501';
  END IF;

  IF p_action IN ('request', 'expire') THEN
    donation_id := p_id;
  ELSIF p_action IN ('approve', 'reject') THEN
    SELECT * INTO r FROM pickup_requests WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Request not found' USING ERRCODE = 'P0002'; END IF;
    donation_id := r.donation_id;
  ELSIF p_action IN ('complete', 'cancel') THEN
    SELECT * INTO p FROM pickups WHERE id = p_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pickup not found' USING ERRCODE = 'P0002'; END IF;
    SELECT * INTO r FROM pickup_requests WHERE id = p.request_id;
    donation_id := r.donation_id;
  ELSE
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;

  -- Every operation locks the donation first, then its children. Concurrent
  -- requests, approvals, rejection, expiry, and cancellation serialize here.
  SELECT * INTO d FROM food_donations WHERE id = donation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Donation not found' USING ERRCODE = 'P0002'; END IF;

  IF p_action = 'request' THEN
    IF actor_role <> 'ngo' THEN RAISE EXCEPTION 'NGOs only' USING ERRCODE = '42501'; END IF;
    IF d.status NOT IN ('available', 'pending') OR d.expiry_time <= NOW() THEN
      RAISE EXCEPTION 'Donation is no longer available' USING ERRCODE = '23514';
    END IF;
    INSERT INTO pickup_requests (donation_id, ngo_id) VALUES (d.id, p_user_id) RETURNING * INTO r;
    UPDATE food_donations SET status = 'pending' WHERE id = d.id;
    RETURN jsonb_build_object('request', to_jsonb(r), 'donor_id', d.donor_id, 'food_type', d.food_type);
  END IF;

  IF p_action IN ('expire', 'approve', 'reject') AND (actor_role <> 'donor' OR d.donor_id <> p_user_id) THEN
    RAISE EXCEPTION 'Not your donation' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'expire' THEN
    IF d.status = 'claimed' THEN RAISE EXCEPTION 'Donation has already been claimed' USING ERRCODE = '23514'; END IF;
    UPDATE food_donations SET status = 'expired' WHERE id = d.id;
    UPDATE pickup_requests SET status = 'rejected' WHERE pickup_requests.donation_id = d.id AND status = 'pending';
    RETURN jsonb_build_object('success', TRUE);
  END IF;

  SELECT * INTO r FROM pickup_requests WHERE id = r.id FOR UPDATE;
  IF p_action IN ('approve', 'reject') THEN
    IF r.status <> 'pending' OR d.status NOT IN ('available', 'pending') OR d.expiry_time <= NOW() THEN
      RAISE EXCEPTION 'Request is no longer available' USING ERRCODE = '23514';
    END IF;
    IF p_action = 'approve' THEN
      IF p_scheduled_time IS NOT NULL AND (p_scheduled_time < NOW() OR p_scheduled_time >= d.expiry_time) THEN
        RAISE EXCEPTION 'Pickup time must be before expiry and in the future' USING ERRCODE = '22023';
      END IF;
      UPDATE food_donations SET status = 'claimed' WHERE id = d.id;
      UPDATE pickup_requests SET status = 'approved' WHERE id = r.id;
      UPDATE pickup_requests SET status = 'rejected' WHERE pickup_requests.donation_id = d.id AND id <> r.id AND status = 'pending';
      INSERT INTO pickups (request_id, scheduled_time) VALUES (r.id, p_scheduled_time) RETURNING * INTO p;
      RETURN jsonb_build_object('success', TRUE, 'pickup', to_jsonb(p), 'ngo_id', r.ngo_id, 'food_type', d.food_type, 'donation_id', d.id);
    END IF;
    UPDATE pickup_requests SET status = 'rejected' WHERE id = r.id;
    IF NOT EXISTS (SELECT 1 FROM pickup_requests WHERE pickup_requests.donation_id = d.id AND status = 'pending') THEN
      UPDATE food_donations SET status = 'available' WHERE id = d.id;
    END IF;
    RETURN jsonb_build_object('success', TRUE, 'ngo_id', r.ngo_id, 'food_type', d.food_type, 'donation_id', d.id);
  END IF;

  IF NOT ((actor_role = 'donor' AND d.donor_id = p_user_id) OR (actor_role = 'ngo' AND r.ngo_id = p_user_id)) THEN
    RAISE EXCEPTION 'Not authorized for this pickup' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM pickups WHERE id = p.id FOR UPDATE;
  IF p.status <> 'scheduled' THEN RAISE EXCEPTION 'Pickup is no longer scheduled' USING ERRCODE = '23514'; END IF;
  IF p_action = 'complete' THEN
    UPDATE pickups SET status = 'completed', completed_at = NOW() WHERE id = p.id RETURNING * INTO p;
  ELSE
    UPDATE pickups SET status = 'cancelled' WHERE id = p.id RETURNING * INTO p;
    UPDATE pickup_requests SET status = 'rejected' WHERE id = r.id;
    UPDATE food_donations SET status = CASE WHEN expiry_time > NOW() THEN 'available'::donation_status ELSE 'expired'::donation_status END WHERE id = d.id;
  END IF;
  RETURN jsonb_build_object('success', TRUE, 'pickup', to_jsonb(p), 'donation_id', d.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_food_profile(p_user_id UUID, p_email TEXT, p_role user_role, p_phone TEXT, p_profile JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE existing_role user_role;
BEGIN
  -- Serialize registration even when the account row does not exist yet.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT, 0));
  SELECT role INTO existing_role FROM app_users WHERE id = p_user_id FOR UPDATE;
  IF existing_role IS NOT NULL AND existing_role <> p_role THEN
    RAISE EXCEPTION 'An account cannot change its registered role' USING ERRCODE = '23514';
  END IF;
  INSERT INTO app_users (id, email, role, phone) VALUES (p_user_id, p_email, p_role, p_phone)
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, email = EXCLUDED.email;
  IF p_role = 'donor' THEN
    INSERT INTO donors (user_id, organization_name, address, latitude, longitude)
      VALUES (p_user_id, trim(p_profile->>'organization_name'), trim(p_profile->>'address'), (p_profile->>'latitude')::NUMERIC, (p_profile->>'longitude')::NUMERIC)
      ON CONFLICT (user_id) DO UPDATE SET organization_name = EXCLUDED.organization_name, address = EXCLUDED.address, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;
  ELSE
    INSERT INTO ngos (user_id, ngo_name, registration_number, address, latitude, longitude, notification_radius_km)
      VALUES (p_user_id, trim(p_profile->>'ngo_name'), trim(p_profile->>'registration_number'), trim(p_profile->>'address'), (p_profile->>'latitude')::NUMERIC, (p_profile->>'longitude')::NUMERIC, COALESCE((p_profile->>'notification_radius_km')::INT, 5))
      ON CONFLICT (user_id) DO UPDATE SET ngo_name = EXCLUDED.ngo_name, registration_number = EXCLUDED.registration_number, address = EXCLUDED.address, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, notification_radius_km = EXCLUDED.notification_radius_km;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.change_food_workflow(TEXT, UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_food_profile(UUID, TEXT, user_role, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nearby_ngos(FLOAT, FLOAT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nearby_donations(FLOAT, FLOAT, FLOAT) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.expire_old_donations() RETURNS VOID
LANGUAGE sql SET search_path = public AS $$
  UPDATE food_donations SET status = 'expired' WHERE status IN ('available', 'pending') AND expiry_time <= NOW();
  UPDATE pickup_requests SET status = 'rejected' WHERE status = 'pending'
    AND donation_id IN (SELECT id FROM food_donations WHERE status = 'expired');
$$;
REVOKE EXECUTE ON FUNCTION public.expire_old_donations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_food_workflow(TEXT, UUID, UUID, TIMESTAMPTZ),
  public.register_food_profile(UUID, TEXT, user_role, TEXT, JSONB),
  public.get_nearby_ngos(FLOAT, FLOAT), public.get_nearby_donations(FLOAT, FLOAT, FLOAT),
  public.expire_old_donations() TO service_role;
COMMIT;
