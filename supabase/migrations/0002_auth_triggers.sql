-- Auth Triggers: auto-create profile on user sign-up

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
  v_referral_code TEXT;
BEGIN
  -- Determine role from metadata (set during sign-up)
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'customer'::user_role
  );

  -- Generate unique referral code
  v_referral_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 8));

  INSERT INTO profiles (
    id,
    role,
    full_name,
    phone,
    avatar_url,
    referral_code
  ) VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    v_referral_code
  );

  -- If they signed up as a pro, create the pros record
  IF v_role = 'pro' THEN
    INSERT INTO pros (id) VALUES (NEW.id);
  END IF;

  -- If they signed up as a driver, create the drivers record
  IF v_role = 'driver' THEN
    INSERT INTO drivers (id) VALUES (NEW.id);
  END IF;

  -- Add to verification queue if hub, pro, or driver
  IF v_role IN ('hub', 'pro', 'driver') THEN
    INSERT INTO verification_queue (entity_type, entity_id)
    VALUES (v_role::TEXT, NEW.id)
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- SYSTEM EVENT TRIGGERS
-- ─────────────────────────────────────────────

-- Log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO system_events (event_type, entity_type, entity_id, actor_id, metadata, severity)
    VALUES (
      'order.status_changed',
      'order',
      NEW.id,
      NULL,
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'order_number', NEW.order_number
      ),
      'info'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER orders_status_audit
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Log handoff scans
CREATE OR REPLACE FUNCTION log_handoff_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_events (event_type, entity_type, entity_id, actor_id, metadata, severity)
  VALUES (
    'handoff.scanned',
    'handoff',
    NEW.id,
    NEW.scanned_by,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'bag_id', NEW.bag_id,
      'step', NEW.step,
      'has_photo', array_length(NEW.photo_urls, 1) > 0
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER handoffs_audit
  AFTER INSERT ON handoffs
  FOR EACH ROW EXECUTE FUNCTION log_handoff_created();

-- Log profile activation changes
CREATE OR REPLACE FUNCTION log_profile_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO system_events (event_type, entity_type, entity_id, metadata, severity)
    VALUES (
      CASE WHEN NEW.is_active THEN 'profile.activated' ELSE 'profile.deactivated' END,
      'profile',
      NEW.id,
      jsonb_build_object('role', NEW.role),
      CASE WHEN NEW.is_active THEN 'info' ELSE 'warn' END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_activation_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_activation();

-- Log payment events
CREATE OR REPLACE FUNCTION log_payment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_events (event_type, entity_type, entity_id, metadata, severity)
  VALUES (
    'payment.' || NEW.type::TEXT,
    'payment',
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'amount_cents', NEW.amount_cents,
      'status', NEW.status
    ),
    'info'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payment_ledger_audit
  AFTER INSERT ON payment_ledger
  FOR EACH ROW EXECUTE FUNCTION log_payment_event();
