-- Handoff step enum (chain of custody)
CREATE TYPE handoff_step AS ENUM (
  'customer_to_driver',
  'driver_to_hub',
  'hub_to_pro',
  'pro_to_hub',
  'hub_to_driver',
  'driver_to_customer'
);

-- Handoffs table — one row per physical custody transfer
CREATE TABLE handoffs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bag_id        uuid REFERENCES bags(id) ON DELETE SET NULL,
  step          handoff_step NOT NULL,
  from_user_id  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  photo_urls    text[] NOT NULL DEFAULT '{}',
  signature_url text,
  location_lat  double precision,
  location_lng  double precision,
  created_at    timestamptz DEFAULT now(),

  -- Prevent duplicate scans for the same bag at the same step
  UNIQUE (bag_id, step, order_id)
);

CREATE INDEX handoffs_order_id_idx ON handoffs(order_id);
CREATE INDEX handoffs_bag_id_idx ON handoffs(bag_id);
CREATE INDEX handoffs_created_at_idx ON handoffs(created_at DESC);

-- RLS
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;

-- Customers see handoffs for their orders
CREATE POLICY "Customers see handoffs for their orders"
  ON handoffs FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

-- Hub operators see handoffs for their hub's orders
CREATE POLICY "Hubs see handoffs for their orders"
  ON handoffs FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE hub_id IN (
        SELECT id FROM hubs WHERE owner_id = auth.uid()
      )
    )
  );

-- Assigned parties can insert handoffs
CREATE POLICY "Authenticated users can insert handoffs"
  ON handoffs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admins full access
CREATE POLICY "Admins full access to handoffs"
  ON handoffs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role bypass
CREATE POLICY "Service role full access handoffs"
  ON handoffs FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE handoffs;
