-- LaundrLink: Initial Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('customer', 'hub', 'pro', 'driver', 'admin');

CREATE TYPE bag_status AS ENUM (
  'unassigned',
  'in_transit_to_hub',
  'at_hub',
  'with_pro',
  'in_transit_to_customer',
  'delivered'
);

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

CREATE TYPE handoff_step AS ENUM (
  'customer_to_driver',
  'driver_to_hub',
  'hub_to_pro',
  'pro_to_hub',
  'hub_to_driver',
  'driver_to_customer'
);

CREATE TYPE service_type AS ENUM ('wash_fold', 'dry_clean', 'iron', 'specialist');
CREATE TYPE fit2work_status AS ENUM ('not_submitted', 'pending', 'clear', 'caution', 'adverse');
CREATE TYPE pro_tier AS ENUM ('rookie', 'elite', 'legendary');
CREATE TYPE loyalty_tier AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE dispatch_provider AS ENUM ('uberdirect', 'doordash', 'native');
CREATE TYPE payment_type AS ENUM (
  'charge', 'payout_hub', 'payout_pro', 'payout_driver',
  'refund', 'platform_fee', 'loyalty_credit'
);
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE ndis_invoice_status AS ENUM ('draft', 'sent', 'paid');
CREATE TYPE event_severity AS ENUM ('info', 'warn', 'error');

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role                user_role NOT NULL DEFAULT 'customer',
  full_name           TEXT,
  phone               TEXT UNIQUE,
  phone_verified      BOOLEAN DEFAULT FALSE,
  avatar_url          TEXT,
  address             JSONB,       -- {street, suburb, state, postcode, lat, lng}
  stripe_customer_id  TEXT,
  loyalty_points      INTEGER DEFAULT 0,
  loyalty_tier        loyalty_tier DEFAULT 'bronze',
  referral_code       TEXT UNIQUE,
  referred_by         UUID REFERENCES profiles(id),
  ndis_number         TEXT,
  ndis_plan_manager   TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- HUBS (commercial laundromats/businesses)
-- ─────────────────────────────────────────────
CREATE TABLE hubs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                    UUID NOT NULL REFERENCES profiles(id),
  business_name               TEXT NOT NULL,
  abn                         TEXT,
  address                     JSONB NOT NULL,
  location                    GEOGRAPHY(Point, 4326),
  contact_name                TEXT,
  email                       TEXT,
  phone                       TEXT,
  business_type               TEXT,
  insurance_policy            TEXT,
  insurance_expiry            DATE,
  services                    TEXT[] DEFAULT '{}',
  price_per_bag               INTEGER DEFAULT 4500,   -- cents
  express_price_per_bag       INTEGER DEFAULT 6500,   -- cents
  capacity                    INTEGER DEFAULT 50,
  current_load                INTEGER DEFAULT 0,
  operating_hours             JSONB,  -- {mon:{open:'07:00',close:'18:00'}, ...}
  photos                      TEXT[] DEFAULT '{}',
  rating_avg                  NUMERIC(3,2) DEFAULT 0,
  rating_count                INTEGER DEFAULT 0,
  is_ndis_approved            BOOLEAN DEFAULT FALSE,
  is_verified                 BOOLEAN DEFAULT FALSE,
  is_active                   BOOLEAN DEFAULT TRUE,
  paused                      BOOLEAN DEFAULT FALSE,
  stripe_connect_id           TEXT,
  stripe_onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX hubs_location_idx ON hubs USING GIST(location);
CREATE INDEX hubs_active_idx ON hubs(is_active, is_verified, paused);

-- ─────────────────────────────────────────────
-- PROS (home washers)
-- ─────────────────────────────────────────────
CREATE TABLE pros (
  id                          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  affiliated_hub_id           UUID REFERENCES hubs(id),
  address                     JSONB,
  location                    GEOGRAPHY(Point, 4326),
  bio                         TEXT,
  abn                         TEXT,
  id_verified                 BOOLEAN DEFAULT FALSE,
  police_check_status         fit2work_status DEFAULT 'not_submitted',
  police_check_date           DATE,
  fit2work_reference          TEXT,
  machine_type                TEXT,
  machine_capacity_kg         NUMERIC(4,1),
  has_dryer                   BOOLEAN DEFAULT FALSE,
  has_iron                    BOOLEAN DEFAULT FALSE,
  setup_photo_url             TEXT,
  detergent_type              TEXT DEFAULT 'standard',
  services                    TEXT[] DEFAULT '{}',
  price_per_bag               INTEGER DEFAULT 3500,   -- cents
  express_price_per_bag       INTEGER DEFAULT 5500,   -- cents
  max_bags_per_day            INTEGER DEFAULT 10,
  availability                JSONB,  -- {mon:{start:'08:00',end:'16:00'}, ...}
  handles_own_delivery        BOOLEAN DEFAULT FALSE,
  tier                        pro_tier DEFAULT 'rookie',
  total_orders                INTEGER DEFAULT 0,
  rating_avg                  NUMERIC(3,2) DEFAULT 0,
  rating_count                INTEGER DEFAULT 0,
  quiz_passed                 BOOLEAN DEFAULT FALSE,
  pledge_signed               BOOLEAN DEFAULT FALSE,
  is_available                BOOLEAN DEFAULT FALSE,
  is_active                   BOOLEAN DEFAULT TRUE,
  paused                      BOOLEAN DEFAULT FALSE,
  stripe_connect_id           TEXT,
  stripe_onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pros_location_idx ON pros USING GIST(location);
CREATE INDEX pros_available_idx ON pros(is_available, is_active, police_check_status);

-- ─────────────────────────────────────────────
-- DRIVERS
-- ─────────────────────────────────────────────
CREATE TABLE drivers (
  id                          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type                TEXT,   -- car/bike/scooter/on_foot
  licence_photo_url           TEXT,
  abn                         TEXT,
  police_check_status         fit2work_status DEFAULT 'not_submitted',
  location                    GEOGRAPHY(Point, 4326),
  rating_avg                  NUMERIC(3,2) DEFAULT 0,
  rating_count                INTEGER DEFAULT 0,
  total_runs                  INTEGER DEFAULT 0,
  is_available                BOOLEAN DEFAULT FALSE,
  is_verified                 BOOLEAN DEFAULT FALSE,
  is_active                   BOOLEAN DEFAULT TRUE,
  stripe_connect_id           TEXT,
  stripe_onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX drivers_location_idx ON drivers USING GIST(location);

-- ─────────────────────────────────────────────
-- SMART BAGS
-- ─────────────────────────────────────────────
CREATE TABLE bags (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code             TEXT UNIQUE NOT NULL,
  current_status      bag_status DEFAULT 'unassigned',
  current_order_id    UUID,   -- FK added after orders table is created
  current_holder_id   UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX bags_qr_idx ON bags(qr_code);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              TEXT UNIQUE NOT NULL DEFAULT 'LL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0'),
  customer_id               UUID NOT NULL REFERENCES profiles(id),
  hub_id                    UUID REFERENCES hubs(id),
  pro_id                    UUID REFERENCES pros(id),
  driver_pickup_id          UUID REFERENCES profiles(id),
  driver_deliver_id         UUID REFERENCES profiles(id),
  status                    order_status DEFAULT 'pending',
  service_type              service_type NOT NULL DEFAULT 'wash_fold',
  addons                    JSONB DEFAULT '{}',  -- {ironing:true, hypoallergenic:true}
  special_instructions      TEXT,
  pickup_address            JSONB NOT NULL,
  delivery_address          JSONB NOT NULL,
  pickup_scheduled_at       TIMESTAMPTZ,
  delivery_scheduled_at     TIMESTAMPTZ,
  estimated_ready_at        TIMESTAMPTZ,
  is_ndis                   BOOLEAN DEFAULT FALSE,
  ndis_invoice_id           UUID,   -- FK added after ndis_invoices table
  subtotal_cents            INTEGER,
  pickup_fee_cents          INTEGER DEFAULT 0,
  delivery_fee_cents        INTEGER DEFAULT 0,
  express_fee_cents         INTEGER DEFAULT 0,
  addon_fees_cents          INTEGER DEFAULT 0,
  total_cents               INTEGER,
  platform_fee_cents        INTEGER,
  hub_payout_cents          INTEGER,
  pro_payout_cents          INTEGER,
  driver_payout_cents       INTEGER,
  payment_status            TEXT DEFAULT 'pending',
  stripe_payment_intent_id  TEXT,
  stripe_transfer_ids       JSONB,  -- {hub: ..., pro: ..., driver: ...}
  dispatch_provider         dispatch_provider,
  dispatch_order_id         TEXT,
  completed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX orders_customer_idx ON orders(customer_id);
CREATE INDEX orders_hub_idx ON orders(hub_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_created_idx ON orders(created_at DESC);

-- Add FK from bags back to orders
ALTER TABLE bags ADD CONSTRAINT bags_current_order_fk
  FOREIGN KEY (current_order_id) REFERENCES orders(id);

-- ─────────────────────────────────────────────
-- HANDOFFS (chain of custody)
-- ─────────────────────────────────────────────
CREATE TABLE handoffs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  bag_id          UUID NOT NULL REFERENCES bags(id),
  step            handoff_step NOT NULL,
  from_user_id    UUID REFERENCES profiles(id),
  to_user_id      UUID REFERENCES profiles(id),
  scanned_by      UUID NOT NULL REFERENCES profiles(id),
  photo_urls      TEXT[] DEFAULT '{}',
  signature_url   TEXT,
  location_lat    NUMERIC(10,7),
  location_lng    NUMERIC(10,7),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate scans for the same step on the same order+bag
  UNIQUE (bag_id, step, order_id)
);

CREATE INDEX handoffs_order_idx ON handoffs(order_id);
CREATE INDEX handoffs_bag_idx ON handoffs(bag_id);
CREATE INDEX handoffs_created_idx ON handoffs(created_at DESC);

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bag_id          UUID REFERENCES bags(id),
  item_type       TEXT,
  quantity        INTEGER DEFAULT 1,
  unit_price_cents INTEGER DEFAULT 0,
  notes           TEXT
);

-- ─────────────────────────────────────────────
-- ORDER RATINGS
-- ─────────────────────────────────────────────
CREATE TABLE order_ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  customer_id         UUID NOT NULL REFERENCES profiles(id),
  rated_entity_type   TEXT NOT NULL CHECK (rated_entity_type IN ('hub', 'pro', 'driver')),
  rated_entity_id     UUID NOT NULL,
  stars               SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags                TEXT[] DEFAULT '{}',
  review_text         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, rated_entity_type, rated_entity_id)
);

-- ─────────────────────────────────────────────
-- PAYMENT LEDGER
-- ─────────────────────────────────────────────
CREATE TABLE payment_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  profile_id          UUID NOT NULL REFERENCES profiles(id),
  type                payment_type NOT NULL,
  amount_cents        INTEGER NOT NULL,
  stripe_event_id     TEXT,
  stripe_transfer_id  TEXT,
  status              payment_status DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX payment_ledger_order_idx ON payment_ledger(order_id);
CREATE INDEX payment_ledger_profile_idx ON payment_ledger(profile_id);

-- ─────────────────────────────────────────────
-- NDIS INVOICES
-- ─────────────────────────────────────────────
CREATE SEQUENCE ndis_invoice_seq START 1;

CREATE TABLE ndis_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  customer_id         UUID NOT NULL REFERENCES profiles(id),
  invoice_number      TEXT UNIQUE NOT NULL DEFAULT 'NDIS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('ndis_invoice_seq')::TEXT, 4, '0'),
  participant_name    TEXT NOT NULL,
  ndis_number         TEXT NOT NULL,
  plan_manager        TEXT,
  support_item_number TEXT DEFAULT '01_020_0120_1_1',
  service_date        DATE,
  amount_cents        INTEGER NOT NULL,
  gst_cents           INTEGER DEFAULT 0,
  pdf_url             TEXT,
  status              ndis_invoice_status DEFAULT 'draft',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from orders to ndis_invoices
ALTER TABLE orders ADD CONSTRAINT orders_ndis_invoice_fk
  FOREIGN KEY (ndis_invoice_id) REFERENCES ndis_invoices(id);

-- ─────────────────────────────────────────────
-- DISPATCH JOBS
-- ─────────────────────────────────────────────
CREATE TABLE dispatch_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id),
  provider          dispatch_provider NOT NULL DEFAULT 'native',
  external_job_id   TEXT,
  status            TEXT DEFAULT 'pending',
  pickup_address    JSONB,
  dropoff_address   JSONB,
  driver_id         UUID REFERENCES profiles(id),
  estimated_eta     TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cost_cents        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS (per-user feed)
-- ─────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id),
  type        TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'in_app')),
  title       TEXT,
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_profile_idx ON notifications(profile_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────
-- REFERRALS & LOYALTY
-- ─────────────────────────────────────────────
CREATE TABLE referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL REFERENCES profiles(id),
  referee_id    UUID NOT NULL REFERENCES profiles(id),
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rewarded')),
  reward_points INTEGER DEFAULT 500,
  rewarded_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referee_id)
);

CREATE TABLE loyalty_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES profiles(id),
  order_id      UUID REFERENCES orders(id),
  type          TEXT CHECK (type IN ('earn', 'redeem', 'bonus', 'expiry')),
  points        INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PRICING CONFIG
-- ─────────────────────────────────────────────
CREATE TABLE pricing_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_bag_cents    INTEGER DEFAULT 4500,
  family_bag_cents        INTEGER DEFAULT 7900,
  express_surcharge_cents INTEGER DEFAULT 2000,
  ironing_addon_cents     INTEGER DEFAULT 1500,
  pickup_fee_cents        INTEGER DEFAULT 800,
  delivery_fee_cents      INTEGER DEFAULT 800,
  driver_fee_base_cents   INTEGER DEFAULT 500,
  driver_fee_per_km_cents INTEGER DEFAULT 100,
  min_order_cents         INTEGER DEFAULT 4500,
  hub_share_percent       NUMERIC(4,2) DEFAULT 70.00,
  platform_share_percent  NUMERIC(4,2) DEFAULT 30.00,
  referrer_reward_points  INTEGER DEFAULT 500,
  referee_reward_points   INTEGER DEFAULT 500,
  points_per_dollar       INTEGER DEFAULT 10,
  points_redeem_rate      INTEGER DEFAULT 100,  -- 100 points = $1
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pricing
INSERT INTO pricing_config DEFAULT VALUES;

-- ─────────────────────────────────────────────
-- HUB TEAM
-- ─────────────────────────────────────────────
CREATE TABLE hub_team (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id      UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  role        TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  permissions JSONB DEFAULT '{"scan": true, "orders": true, "settings": false}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hub_id, user_id)
);

-- ─────────────────────────────────────────────
-- ADMIN USERS
-- ─────────────────────────────────────────────
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  admin_role  TEXT DEFAULT 'support' CHECK (admin_role IN ('super_admin', 'ops_manager', 'support')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- DISPUTES
-- ─────────────────────────────────────────────
CREATE TABLE disputes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id),
  reported_by           UUID NOT NULL REFERENCES profiles(id),
  reported_entity_type  TEXT,
  reported_entity_id    UUID,
  reason                TEXT NOT NULL,
  evidence_photos       TEXT[] DEFAULT '{}',
  status                TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  resolution            TEXT,
  refund_amount_cents   INTEGER DEFAULT 0,
  resolved_by           UUID REFERENCES profiles(id),
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- VERIFICATION QUEUE
-- ─────────────────────────────────────────────
CREATE TABLE verification_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('hub', 'pro', 'driver')),
  entity_id     UUID NOT NULL,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID REFERENCES profiles(id),
  review_notes  TEXT,
  reviewed_at   TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

-- ─────────────────────────────────────────────
-- SYSTEM EVENTS (audit log)
-- ─────────────────────────────────────────────
CREATE TABLE system_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  actor_id    UUID REFERENCES profiles(id),
  metadata    JSONB DEFAULT '{}',
  severity    event_severity DEFAULT 'info',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX system_events_entity_idx ON system_events(entity_type, entity_id);
CREATE INDEX system_events_created_idx ON system_events(created_at DESC);

-- ─────────────────────────────────────────────
-- ENABLE REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE handoffs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_jobs;

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER hubs_updated_at BEFORE UPDATE ON hubs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER pros_updated_at BEFORE UPDATE ON pros
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
