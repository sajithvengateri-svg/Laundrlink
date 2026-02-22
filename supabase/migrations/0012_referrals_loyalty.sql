-- Referrals table
CREATE TABLE referrals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  referee_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  referral_code    text NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','rewarded','expired')),
  referrer_credit_cents integer NOT NULL DEFAULT 1000,  -- $10
  referee_credit_cents  integer NOT NULL DEFAULT 1000,  -- $10
  rewarded_at      timestamptz,
  created_at       timestamptz DEFAULT now(),

  UNIQUE (referrer_id, referee_id),
  UNIQUE (referral_code, referee_id)
);

CREATE INDEX referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX referrals_referee_id_idx ON referrals(referee_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE POLICY "Admins full access to referrals"
  ON referrals FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access referrals"
  ON referrals FOR ALL USING (auth.role() = 'service_role');

-- Loyalty transactions table
CREATE TABLE loyalty_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,
  type         text NOT NULL
    CHECK (type IN ('earn','redeem','expire','bonus','referral')),
  points       integer NOT NULL,  -- positive = earn, negative = redeem/expire
  description  text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX loyalty_transactions_user_id_idx ON loyalty_transactions(user_id);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own loyalty transactions"
  ON loyalty_transactions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins full access to loyalty transactions"
  ON loyalty_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access loyalty"
  ON loyalty_transactions FOR ALL USING (auth.role() = 'service_role');

-- Pricing configuration table (admin-editable)
CREATE TABLE pricing_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text UNIQUE NOT NULL,
  value        jsonb NOT NULL,
  description  text,
  updated_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz DEFAULT now()
);

-- Insert default pricing
INSERT INTO pricing_config (key, value, description) VALUES
  ('platform_fee_pct', '30', 'Platform fee percentage (30%)'),
  ('loyalty_points_per_dollar', '10', 'Points earned per $1 spent'),
  ('points_to_dollar_rate', '100', 'Points required per $1 discount'),
  ('referrer_credit_cents', '1000', 'Credit given to referrer in cents'),
  ('referee_credit_cents', '1000', 'Discount given to referee in cents');

ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to pricing config"
  ON pricing_config FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can read pricing config"
  ON pricing_config FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access pricing config"
  ON pricing_config FOR ALL USING (auth.role() = 'service_role');
