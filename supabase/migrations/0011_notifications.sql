-- Notifications table
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  channel     text NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app','sms','email','push')),
  external_id text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_is_read_idx ON notifications(user_id, is_read);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications read"
  ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins full access to notifications"
  ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access notifications"
  ON notifications FOR ALL USING (auth.role() = 'service_role');

-- Enable Realtime for in-app notification feed
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
