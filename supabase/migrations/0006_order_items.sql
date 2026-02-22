-- Order line items
CREATE TABLE order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type        text NOT NULL,
  notes            text,
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON order_items(order_id);

-- RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Inherit access from parent order
CREATE POLICY "Users see items for their orders"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
    OR order_id IN (
      SELECT id FROM orders WHERE hub_id IN (
        SELECT id FROM hubs WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Customers can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Admins full access to order items"
  ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access order items"
  ON order_items FOR ALL USING (auth.role() = 'service_role');
