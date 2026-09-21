-- supabase/migrations/20260921_push_subscriptions.sql
-- Stores Web Push subscriptions so the server can send push notifications.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Any browser (anon or authenticated) can subscribe/unsubscribe.
-- The service role (server) can read all subscriptions to send pushes.
CREATE POLICY "push_sub_insert"
  ON push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "push_sub_delete"
  ON push_subscriptions FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "push_sub_select_service"
  ON push_subscriptions FOR SELECT
  TO service_role
  USING (true);
