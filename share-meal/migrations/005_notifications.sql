BEGIN;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS donation_id UUID REFERENCES public.food_donations(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.pickup_requests(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_status TEXT NOT NULL DEFAULT 'skipped';
ALTER TABLE public.notifications ALTER COLUMN push_status SET DEFAULT 'pending';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_ticket_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_error TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS notifications_pending_push_idx ON public.notifications (push_status, created_at);

CREATE OR REPLACE FUNCTION public.record_food_notification() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d food_donations%ROWTYPE; r pickup_requests%ROWTYPE; org_name TEXT;
BEGIN
  -- Legacy API versions still save their own notifications. Enable these
  -- triggers only inside the new transactional RPCs during a rolling release.
  IF current_setting('sharemeal.atomic_notifications', TRUE) IS DISTINCT FROM 'on' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'food_donations' THEN
    IF NEW.status <> 'available' OR NEW.expiry_time <= NOW() THEN RETURN NEW; END IF;
    INSERT INTO notifications (user_id, title, message, donation_id)
      SELECT n.user_id, 'Food available nearby', NEW.food_type || ' (' || NEW.quantity || ') is available for collection.', NEW.id
      FROM ngos n WHERE ST_DWithin(n.location, NEW.location, n.notification_radius_km * 1000);
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'pickup_requests' THEN
    SELECT * INTO d FROM food_donations WHERE id = NEW.donation_id;
    IF TG_OP = 'INSERT' THEN
      SELECT ngo_name INTO org_name FROM ngos WHERE user_id = NEW.ngo_id;
      INSERT INTO notifications (user_id, title, message, donation_id, request_id)
        VALUES (d.donor_id, 'New pickup request', COALESCE(org_name, 'An NGO') || ' requested your ' || d.food_type || '.', d.id, NEW.id);
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
      INSERT INTO notifications (user_id, title, message, donation_id, request_id)
        VALUES (NEW.ngo_id, 'Pickup approved', 'Your request for ' || d.food_type || ' was approved. Arrange collection before expiry.', d.id, NEW.id);
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'rejected'
      AND NOT EXISTS (SELECT 1 FROM pickups WHERE request_id = NEW.id AND status = 'cancelled') THEN
      INSERT INTO notifications (user_id, title, message, donation_id, request_id)
        VALUES (NEW.ngo_id, CASE WHEN d.status = 'expired' THEN 'Listing closed' ELSE 'Pickup request declined' END,
          CASE WHEN d.status = 'expired' THEN d.food_type || ' is no longer available.' ELSE 'Your request for ' || d.food_type || ' was not selected.' END, d.id, NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'cancelled') THEN
    SELECT * INTO r FROM pickup_requests WHERE id = NEW.request_id;
    SELECT * INTO d FROM food_donations WHERE id = r.donation_id;
    INSERT INTO notifications (user_id, title, message, donation_id, request_id)
      SELECT recipient, CASE WHEN NEW.status = 'completed' THEN 'Food collected' ELSE 'Pickup cancelled' END,
        CASE WHEN NEW.status = 'completed' THEN 'Collection of ' || d.food_type || ' is complete.' ELSE 'The pickup for ' || d.food_type || ' was cancelled.' END, d.id, r.id
      FROM (VALUES (d.donor_id), (r.ngo_id)) AS recipients(recipient);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS notify_food_created ON public.food_donations;
CREATE TRIGGER notify_food_created AFTER INSERT ON public.food_donations FOR EACH ROW EXECUTE FUNCTION public.record_food_notification();
DROP TRIGGER IF EXISTS notify_request_changed ON public.pickup_requests;
CREATE TRIGGER notify_request_changed AFTER INSERT OR UPDATE OF status ON public.pickup_requests FOR EACH ROW EXECUTE FUNCTION public.record_food_notification();
DROP TRIGGER IF EXISTS notify_pickup_changed ON public.pickups;
CREATE TRIGGER notify_pickup_changed AFTER UPDATE OF status ON public.pickups FOR EACH ROW EXECUTE FUNCTION public.record_food_notification();
REVOKE EXECUTE ON FUNCTION public.record_food_notification() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.create_food_donation(p_user_id UUID, p_donation JSONB) RETURNS JSONB
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d food_donations%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM donors WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Complete your donor profile first' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('sharemeal.atomic_notifications', 'on', TRUE);
  INSERT INTO food_donations (donor_id, food_type, quantity, address, image_path, latitude, longitude, expiry_time)
    VALUES (p_user_id, p_donation->>'food_type', p_donation->>'quantity', p_donation->>'address',
      p_donation->>'image_path', (p_donation->>'latitude')::NUMERIC, (p_donation->>'longitude')::NUMERIC,
      (p_donation->>'expiry_time')::TIMESTAMPTZ) RETURNING * INTO d;
  RETURN to_jsonb(d);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_food_donation(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_food_donation(UUID, JSONB) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
