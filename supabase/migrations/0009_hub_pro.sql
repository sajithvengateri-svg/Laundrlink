-- Hubs table
CREATE TABLE hubs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  business_name    text NOT NULL,
  abn              text,
  address          jsonb NOT NULL DEFAULT '{}',
  location         geography(Point, 4326),
  phone            text,
  email            text,
  operating_hours  jsonb DEFAULT '{}',
  capacity         integer NOT NULL DEFAULT 50 CHECK (capacity > 0),
  current_load     integer NOT NULL DEFAULT 0 CHECK (current_load >= 0),
  rating_avg       numeric(3,2),
  rating_count     integer NOT NULL DEFAULT 0,
  stripe_connect_id text,
  stripe_charges_enabled boolean NOT NULL DEFAULT false,
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT false,
  verified_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- PostGIS index for proximity searches
CREATE INDEX hubs_location_idx ON hubs USING GIST(location);
CREATE INDEX hubs_is_active_idx ON hubs(is_active);
CREATE INDEX hubs_owner_id_idx ON hubs(owner_id);

ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hub owner sees own hub"
  ON hubs FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Hub owner updates own hub"
  ON hubs FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Hub owner inserts own hub"
  ON hubs FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Active hubs are visible to all authenticated users (for order booking)
CREATE POLICY "Authenticated users see active hubs"
  ON hubs FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Admins full access to hubs"
  ON hubs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access hubs"
  ON hubs FOR ALL USING (auth.role() = 'service_role');

-- Laundry Pros table
CREATE TABLE pros (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  hub_id           uuid REFERENCES hubs(id) ON DELETE SET NULL,
  business_name    text,
  bio              text,
  location         geography(Point, 4326),
  service_radius_km integer NOT NULL DEFAULT 10,
  services         text[] DEFAULT '{}',
  hourly_rate_cents integer,
  stripe_connect_id text,
  stripe_charges_enabled boolean NOT NULL DEFAULT false,
  fit2work_status  text NOT NULL DEFAULT 'pending'
    CHECK (fit2work_status IN ('pending','submitted','cleared','failed')),
  is_available     boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT false,
  rating_avg       numeric(3,2),
  rating_count     integer NOT NULL DEFAULT 0,
  tier             text NOT NULL DEFAULT 'rookie'
    CHECK (tier IN ('rookie','elite','legendary')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX pros_location_idx ON pros USING GIST(location);
CREATE INDEX pros_hub_id_idx ON pros(hub_id);
CREATE INDEX pros_user_id_idx ON pros(user_id);

ALTER TABLE pros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pro sees own profile"
  ON pros FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Pro updates own profile"
  ON pros FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Pro inserts own profile"
  ON pros FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users see active pros"
  ON pros FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

CREATE POLICY "Admins full access to pros"
  ON pros FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access pros"
  ON pros FOR ALL USING (auth.role() = 'service_role');

-- PostGIS stored function: find nearest active hubs
CREATE OR REPLACE FUNCTION find_nearest_hubs(
  order_lat   double precision,
  order_lng   double precision,
  radius_km   double precision DEFAULT 20,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id                    uuid,
  business_name         text,
  address               jsonb,
  distance_km           double precision,
  rating                numeric,
  capacity              integer,
  current_load          integer,
  available_capacity_pct double precision
) LANGUAGE sql STABLE AS $$
  SELECT
    h.id,
    h.business_name,
    h.address,
    ST_Distance(h.location::geography, ST_SetSRID(ST_MakePoint(order_lng, order_lat), 4326)::geography) / 1000.0 AS distance_km,
    h.rating_avg AS rating,
    h.capacity,
    h.current_load,
    CASE WHEN h.capacity > 0 THEN (h.capacity - h.current_load)::double precision / h.capacity ELSE 0 END AS available_capacity_pct
  FROM hubs h
  WHERE
    h.is_active = true
    AND ST_DWithin(
      h.location::geography,
      ST_SetSRID(ST_MakePoint(order_lng, order_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT result_limit;
$$;

-- Atomic increment for hub current_load
CREATE OR REPLACE FUNCTION increment_hub_load(hub_id uuid, delta integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE hubs SET current_load = GREATEST(0, current_load + delta) WHERE id = hub_id;
END;
$$;
