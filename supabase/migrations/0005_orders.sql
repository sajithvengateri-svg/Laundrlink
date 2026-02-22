-- Order status and service type enums
CREATE TYPE order_status AS ENUM (
  'pending',
  'pickup_scheduled',
  'picked_up_by_driver',
  'at_hub',
  'assigned_to_pro',
  'with_pro',
  'returned_to_hub',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

CREATE TYPE service_type AS ENUM (
  'wash_fold',
  'wash_iron',
  'dry_clean',
  'ironing',
  'express'
);

-- Orders table
CREATE TABLE orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              text UNIQUE NOT NULL,
  customer_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  hub_id                    uuid REFERENCES hubs(id) ON DELETE SET NULL,
  pro_id                    uuid REFERENCES pros(id) ON DELETE SET NULL,
  driver_pickup_id          uuid REFERENCES drivers(id) ON DELETE SET NULL,
  driver_deliver_id         uuid REFERENCES drivers(id) ON DELETE SET NULL,
  status                    order_status NOT NULL DEFAULT 'pending',
  service_type              service_type NOT NULL,
  pickup_address            jsonb NOT NULL,
  delivery_address          jsonb NOT NULL,
  pickup_scheduled_at       timestamptz,
  delivery_scheduled_at     timestamptz,
  special_instructions      text,
  subtotal_cents            integer NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  total_cents               integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  platform_fee_cents        integer NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  hub_payout_cents          integer NOT NULL DEFAULT 0 CHECK (hub_payout_cents >= 0),
  pro_payout_cents          integer NOT NULL DEFAULT 0 CHECK (pro_payout_cents >= 0),
  driver_payout_cents       integer NOT NULL DEFAULT 0 CHECK (driver_payout_cents >= 0),
  is_ndis                   boolean NOT NULL DEFAULT false,
  ndis_invoice_id           uuid,
  stripe_payment_intent_id  text,
  dispatch_provider         text CHECK (dispatch_provider IN ('uberdirect','doordash','native')),
  dispatch_order_id         text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX orders_customer_id_idx ON orders(customer_id);
CREATE INDEX orders_hub_id_idx ON orders(hub_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_at_idx ON orders(created_at DESC);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers see their own orders
CREATE POLICY "Customers see own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can insert orders
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can cancel pending/pickup_scheduled orders
CREATE POLICY "Customers can update own orders"
  ON orders FOR UPDATE
  USING (customer_id = auth.uid());

-- Hubs see their orders
CREATE POLICY "Hubs see assigned orders"
  ON orders FOR SELECT
  USING (
    hub_id IN (SELECT id FROM hubs WHERE owner_id = auth.uid())
  );

-- Pros see their orders
CREATE POLICY "Pros see assigned orders"
  ON orders FOR SELECT
  USING (
    pro_id IN (SELECT id FROM pros WHERE user_id = auth.uid())
  );

-- Drivers see their orders
CREATE POLICY "Drivers see their pickup/delivery orders"
  ON orders FOR SELECT
  USING (
    driver_pickup_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    OR driver_deliver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Admins full access
CREATE POLICY "Admins full access to orders"
  ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service role bypass
CREATE POLICY "Service role full access orders"
  ON orders FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
