-- System events audit log
CREATE TABLE system_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  table_name  text,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  severity    text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','error','critical')),
  message     text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX system_events_event_type_idx ON system_events(event_type);
CREATE INDEX system_events_record_id_idx ON system_events(record_id);
CREATE INDEX system_events_created_at_idx ON system_events(created_at DESC);
CREATE INDEX system_events_severity_idx ON system_events(severity) WHERE severity IN ('warning','error','critical');

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read system events
CREATE POLICY "Admins full access to system events"
  ON system_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access system events"
  ON system_events FOR ALL USING (auth.role() = 'service_role');

-- ─── Audit Triggers ──────────────────────────────────────────────────────────

-- Log every orders.status change
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO system_events (event_type, table_name, record_id, old_data, new_data, message)
    VALUES (
      'order.status_changed',
      'orders',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'order_number', NEW.order_number),
      format('Order %s: %s → %s', NEW.order_number, OLD.status, NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_audit
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Log every handoff insertion (each QR scan)
CREATE OR REPLACE FUNCTION log_handoff_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO system_events (event_type, table_name, record_id, new_data, message)
  VALUES (
    'handoff.created',
    'handoffs',
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'bag_id', NEW.bag_id,
      'step', NEW.step,
      'scanned_by', NEW.scanned_by
    ),
    format('Handoff scanned: %s for order %s', NEW.step, NEW.order_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER handoffs_audit
  AFTER INSERT ON handoffs
  FOR EACH ROW EXECUTE FUNCTION log_handoff_created();

-- Log every payment_ledger insertion
CREATE OR REPLACE FUNCTION log_payment_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO system_events (event_type, table_name, record_id, new_data, message)
  VALUES (
    'payment.' || NEW.type,
    'payment_ledger',
    NEW.id,
    jsonb_build_object(
      'order_id', NEW.order_id,
      'type', NEW.type,
      'amount_cents', NEW.amount_cents
    ),
    format('Payment %s: %s cents for order %s', NEW.type, NEW.amount_cents, NEW.order_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_ledger_audit
  AFTER INSERT ON payment_ledger
  FOR EACH ROW EXECUTE FUNCTION log_payment_event();

-- Log profile active status changes (hub/pro activation)
CREATE OR REPLACE FUNCTION log_profile_active_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO system_events (event_type, table_name, record_id, old_data, new_data, message)
    VALUES (
      'profile.active_changed',
      'profiles',
      NEW.id,
      jsonb_build_object('is_active', OLD.is_active, 'role', OLD.role),
      jsonb_build_object('is_active', NEW.is_active, 'role', NEW.role, 'full_name', NEW.full_name),
      format('Profile %s (%s): active changed to %s', NEW.full_name, NEW.role, NEW.is_active)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_active_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_active_change();

-- ─── Lost Bag Detection ───────────────────────────────────────────────────────

-- Function: detect orders with no handoff activity in the last 48 hours.
-- Called by a pg_cron job (or manually) to write system_events + flag for admin.
CREATE OR REPLACE FUNCTION detect_lost_bags()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  lost_count integer := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT
      o.id AS order_id,
      o.order_number,
      o.status,
      MAX(h.created_at) AS last_handoff_at,
      o.created_at AS order_created_at
    FROM orders o
    LEFT JOIN handoffs h ON h.order_id = o.id
    WHERE
      o.status NOT IN ('delivered', 'cancelled', 'pending')
      AND o.created_at < now() - INTERVAL '48 hours'
    GROUP BY o.id, o.order_number, o.status, o.created_at
    HAVING
      MAX(h.created_at) < now() - INTERVAL '48 hours'
      OR MAX(h.created_at) IS NULL
  LOOP
    -- Only log if we haven't already logged this recently (avoid duplicate alerts)
    IF NOT EXISTS (
      SELECT 1 FROM system_events
      WHERE
        event_type = 'order.lost_bag_detected'
        AND record_id = rec.order_id
        AND created_at > now() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO system_events (
        event_type, table_name, record_id,
        severity, message, metadata
      ) VALUES (
        'order.lost_bag_detected',
        'orders',
        rec.order_id,
        'critical',
        format('LOST BAG: Order %s (status: %s) has had no handoff activity for 48+ hours',
               rec.order_number, rec.status),
        jsonb_build_object(
          'order_id', rec.order_id,
          'order_number', rec.order_number,
          'status', rec.status,
          'last_handoff_at', rec.last_handoff_at,
          'order_created_at', rec.order_created_at
        )
      );
      lost_count := lost_count + 1;
    END IF;
  END LOOP;

  RETURN lost_count;
END;
$$;

-- Comment: To schedule lost bag detection, run in Supabase SQL editor:
-- SELECT cron.schedule('detect-lost-bags', '0 * * * *', 'SELECT detect_lost_bags()');
