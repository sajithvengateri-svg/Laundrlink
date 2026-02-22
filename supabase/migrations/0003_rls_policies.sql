-- Row Level Security Policies for LaundrLink
-- Pattern: users see their own data; partners see assigned orders; admins see all.

-- ─────────────────────────────────────────────
-- HELPER FUNCTION: check if the calling user is an admin
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_admin());

-- Public read for hub/pro profiles (customers need to browse)
CREATE POLICY "profiles_public_select_providers" ON profiles
  FOR SELECT USING (role IN ('hub', 'pro') AND is_active = TRUE);

-- ─────────────────────────────────────────────
-- HUBS
-- ─────────────────────────────────────────────
ALTER TABLE hubs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can browse active hubs (for order placement)
CREATE POLICY "hubs_public_read" ON hubs
  FOR SELECT USING (is_active = TRUE AND is_verified = TRUE);

-- Hub owners can read their own hub regardless of verification
CREATE POLICY "hubs_owner_read" ON hubs
  FOR SELECT USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "hubs_owner_update" ON hubs
  FOR UPDATE USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "hubs_insert_authenticated" ON hubs
  FOR INSERT WITH CHECK (owner_id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- PROS
-- ─────────────────────────────────────────────
ALTER TABLE pros ENABLE ROW LEVEL SECURITY;

-- Authenticated users can browse verified pros (for matching)
CREATE POLICY "pros_public_read" ON pros
  FOR SELECT USING (
    (is_active = TRUE AND police_check_status = 'clear')
    OR id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "pros_owner_update" ON pros
  FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY "pros_insert_self" ON pros
  FOR INSERT WITH CHECK (id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- DRIVERS
-- ─────────────────────────────────────────────
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_own_read" ON drivers
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "drivers_own_update" ON drivers
  FOR UPDATE USING (id = auth.uid() OR is_admin());

CREATE POLICY "drivers_insert_self" ON drivers
  FOR INSERT WITH CHECK (id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- BAGS
-- ─────────────────────────────────────────────
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read bags (needed for QR scan lookup)
CREATE POLICY "bags_authenticated_read" ON bags
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins or the current holder can update bag status
CREATE POLICY "bags_holder_update" ON bags
  FOR UPDATE USING (current_holder_id = auth.uid() OR is_admin());

CREATE POLICY "bags_admin_insert" ON bags
  FOR INSERT WITH CHECK (is_admin());

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers: see their own orders
CREATE POLICY "orders_customer_read" ON orders
  FOR SELECT USING (customer_id = auth.uid());

-- Hub operators: see orders assigned to their hub
CREATE POLICY "orders_hub_read" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hubs WHERE id = orders.hub_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM hub_team WHERE hub_id = orders.hub_id AND user_id = auth.uid()
    )
  );

-- Pros: see their assigned orders
CREATE POLICY "orders_pro_read" ON orders
  FOR SELECT USING (pro_id = auth.uid());

-- Drivers: see orders they're assigned to pick up or deliver
CREATE POLICY "orders_driver_read" ON orders
  FOR SELECT USING (
    driver_pickup_id = auth.uid() OR driver_deliver_id = auth.uid()
  );

-- Admin: see all
CREATE POLICY "orders_admin_read" ON orders
  FOR SELECT USING (is_admin());

-- Customers can create orders
CREATE POLICY "orders_customer_insert" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Hub, Pro, Driver can update status fields (via service layer)
CREATE POLICY "orders_partner_update" ON orders
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM hubs WHERE id = orders.hub_id AND owner_id = auth.uid())
    OR pro_id = auth.uid()
    OR driver_pickup_id = auth.uid()
    OR driver_deliver_id = auth.uid()
    OR is_admin()
  );

-- ─────────────────────────────────────────────
-- HANDOFFS
-- ─────────────────────────────────────────────
ALTER TABLE handoffs ENABLE ROW LEVEL SECURITY;

-- All parties on an order can read its handoffs
CREATE POLICY "handoffs_order_parties_read" ON handoffs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = handoffs.order_id AND (
        o.customer_id = auth.uid()
        OR o.pro_id = auth.uid()
        OR o.driver_pickup_id = auth.uid()
        OR o.driver_deliver_id = auth.uid()
        OR EXISTS (SELECT 1 FROM hubs WHERE id = o.hub_id AND owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM hub_team WHERE hub_id = o.hub_id AND user_id = auth.uid())
      )
    )
    OR is_admin()
  );

-- Authenticated users who are on the order can insert handoffs
CREATE POLICY "handoffs_parties_insert" ON handoffs
  FOR INSERT WITH CHECK (scanned_by = auth.uid());

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_read" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE id = order_items.order_id
      AND (customer_id = auth.uid() OR is_admin())
    )
  );

-- ─────────────────────────────────────────────
-- ORDER RATINGS
-- ─────────────────────────────────────────────
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_customer_insert" ON order_ratings
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "ratings_public_read" ON order_ratings
  FOR SELECT USING (TRUE);  -- ratings are public for trust signals

-- ─────────────────────────────────────────────
-- PAYMENT LEDGER
-- ─────────────────────────────────────────────
ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_ledger_own_read" ON payment_ledger
  FOR SELECT USING (profile_id = auth.uid() OR is_admin());

-- Only edge functions (service role) insert payment records
CREATE POLICY "payment_ledger_service_insert" ON payment_ledger
  FOR INSERT WITH CHECK (is_admin());

-- ─────────────────────────────────────────────
-- NDIS INVOICES
-- ─────────────────────────────────────────────
ALTER TABLE ndis_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ndis_invoices_customer_read" ON ndis_invoices
  FOR SELECT USING (customer_id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- DISPATCH JOBS
-- ─────────────────────────────────────────────
ALTER TABLE dispatch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispatch_jobs_driver_read" ON dispatch_jobs
  FOR SELECT USING (driver_id = auth.uid() OR is_admin());

CREATE POLICY "dispatch_jobs_order_parties_read" ON dispatch_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o WHERE o.id = dispatch_jobs.order_id
      AND (o.customer_id = auth.uid() OR o.hub_id IN (
        SELECT id FROM hubs WHERE owner_id = auth.uid()
      ))
    )
  );

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (profile_id = auth.uid());  -- mark as read

-- ─────────────────────────────────────────────
-- REFERRALS
-- ─────────────────────────────────────────────
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_own_read" ON referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referee_id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- LOYALTY TRANSACTIONS
-- ─────────────────────────────────────────────
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loyalty_own_read" ON loyalty_transactions
  FOR SELECT USING (profile_id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────
-- PRICING CONFIG (public read, admin write)
-- ─────────────────────────────────────────────
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_config_public_read" ON pricing_config
  FOR SELECT USING (TRUE);

CREATE POLICY "pricing_config_admin_write" ON pricing_config
  FOR ALL USING (is_admin());

-- ─────────────────────────────────────────────
-- HUB TEAM
-- ─────────────────────────────────────────────
ALTER TABLE hub_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hub_team_read" ON hub_team
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM hubs WHERE id = hub_team.hub_id AND owner_id = auth.uid())
    OR is_admin()
  );

-- ─────────────────────────────────────────────
-- SYSTEM EVENTS (admin only)
-- ─────────────────────────────────────────────
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_events_admin_read" ON system_events
  FOR SELECT USING (is_admin());

-- ─────────────────────────────────────────────
-- DISPUTES
-- ─────────────────────────────────────────────
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_reporter_read" ON disputes
  FOR SELECT USING (reported_by = auth.uid() OR is_admin());

CREATE POLICY "disputes_customer_insert" ON disputes
  FOR INSERT WITH CHECK (reported_by = auth.uid());

-- ─────────────────────────────────────────────
-- VERIFICATION QUEUE
-- ─────────────────────────────────────────────
ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_queue_admin" ON verification_queue
  FOR ALL USING (is_admin());

-- Entity can read their own verification status
CREATE POLICY "verification_queue_self_read" ON verification_queue
  FOR SELECT USING (entity_id = auth.uid());
