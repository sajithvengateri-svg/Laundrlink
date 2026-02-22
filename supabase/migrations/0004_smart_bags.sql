-- Smart bags table (QR-coded laundry bags)
CREATE TABLE bags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code      text UNIQUE NOT NULL,
  current_status text NOT NULL DEFAULT 'unassigned'
    CHECK (current_status IN ('unassigned','in_transit_to_hub','at_hub','with_pro','in_transit_to_customer','delivered')),
  current_order_id  uuid REFERENCES orders(id) ON DELETE SET NULL,
  current_holder_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX bags_qr_code_idx ON bags(qr_code);
CREATE INDEX bags_current_order_idx ON bags(current_order_id);

-- RLS
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;

-- Hub operators see bags assigned to their orders
CREATE POLICY "Hub operators see their bags"
  ON bags FOR SELECT
  USING (
    current_order_id IN (
      SELECT id FROM orders WHERE hub_id IN (
        SELECT id FROM hubs WHERE owner_id = auth.uid()
      )
    )
  );

-- Admins have full access
CREATE POLICY "Admins full access to bags"
  ON bags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass (for edge functions)
CREATE POLICY "Service role full access"
  ON bags FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_bags_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER bags_updated_at BEFORE UPDATE ON bags
  FOR EACH ROW EXECUTE FUNCTION update_bags_updated_at();
