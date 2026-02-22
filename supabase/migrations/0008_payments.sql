-- Payment ledger — records every financial event
CREATE TABLE payment_ledger (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type                text NOT NULL
    CHECK (type IN ('charge','payout_hub','payout_pro','payout_driver','refund','platform_fee')),
  amount_cents        integer NOT NULL,
  currency            text NOT NULL DEFAULT 'aud',
  stripe_transfer_id  text,
  stripe_payment_intent_id text,
  description         text,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX payment_ledger_order_id_idx ON payment_ledger(order_id);
CREATE INDEX payment_ledger_created_at_idx ON payment_ledger(created_at DESC);

-- RLS
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see their payment ledger"
  ON payment_ledger FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Hubs see their payout records"
  ON payment_ledger FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE hub_id IN (
        SELECT id FROM hubs WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins full access to payment ledger"
  ON payment_ledger FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access payment ledger"
  ON payment_ledger FOR ALL USING (auth.role() = 'service_role');

-- NDIS Invoices table
CREATE TABLE ndis_invoices (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number       text UNIQUE NOT NULL,
  participant_name     text NOT NULL,
  ndis_number          text NOT NULL,
  plan_manager         text,
  support_item_number  text NOT NULL DEFAULT '01_020_0120_1_1',
  amount_cents         integer NOT NULL,
  gst_cents            integer NOT NULL DEFAULT 0,
  pdf_url              text,
  status               text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','generating','sent','paid')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX ndis_invoices_order_id_idx ON ndis_invoices(order_id);

ALTER TABLE ndis_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see their ndis invoices"
  ON ndis_invoices FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

CREATE POLICY "Admins full access to ndis invoices"
  ON ndis_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access ndis invoices"
  ON ndis_invoices FOR ALL USING (auth.role() = 'service_role');
