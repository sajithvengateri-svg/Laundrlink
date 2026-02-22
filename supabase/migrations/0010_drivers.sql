-- Drivers table
CREATE TABLE drivers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  vehicle_type        text NOT NULL DEFAULT 'car'
    CHECK (vehicle_type IN ('bicycle','motorbike','car','van')),
  vehicle_rego        text,
  licence_photo_url   text,
  location            geography(Point, 4326),
  fit2work_status     text NOT NULL DEFAULT 'pending'
    CHECK (fit2work_status IN ('pending','submitted','cleared','failed')),
  is_available        boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT false,
  stripe_connect_id   text,
  rating_avg          numeric(3,2),
  rating_count        integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX drivers_location_idx ON drivers USING GIST(location);
CREATE INDEX drivers_user_id_idx ON drivers(user_id);
CREATE INDEX drivers_is_available_idx ON drivers(is_available);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver sees own profile"
  ON drivers FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Driver updates own profile"
  ON drivers FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Driver inserts own profile"
  ON drivers FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access to drivers"
  ON drivers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access drivers"
  ON drivers FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for live driver location tracking
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;

-- Dispatch jobs table
CREATE TABLE dispatch_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider         text NOT NULL DEFAULT 'native'
    CHECK (provider IN ('uberdirect','doordash','native')),
  job_type         text NOT NULL DEFAULT 'pickup'
    CHECK (job_type IN ('pickup','delivery')),
  external_job_id  text,
  status           text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','en_route','completed','failed','cancelled')),
  driver_id        uuid REFERENCES drivers(id) ON DELETE SET NULL,
  cost_cents       integer DEFAULT 0,
  pickup_eta_mins  integer,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX dispatch_jobs_order_id_idx ON dispatch_jobs(order_id);
CREATE INDEX dispatch_jobs_driver_id_idx ON dispatch_jobs(driver_id);

ALTER TABLE dispatch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to dispatch jobs"
  ON dispatch_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access dispatch jobs"
  ON dispatch_jobs FOR ALL USING (auth.role() = 'service_role');

-- Customers can see dispatch jobs for their orders
CREATE POLICY "Customers see dispatch jobs for own orders"
  ON dispatch_jobs FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE dispatch_jobs;
