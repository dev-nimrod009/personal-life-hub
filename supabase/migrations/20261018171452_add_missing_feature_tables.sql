/*
# Add missing feature tables (goal steps, quotes, inbox, budget)

1. Title
   Creates four tables the app was written against but which were never
   created: goal_steps, saved_quotes, inbox_items, app_settings.

2. Plain-English explanation
   Previously, opening Goals with sub-steps, the Quote Vault, the Brain
   Dump inbox, or changing the weekly grocery budget failed, because the
   database tables behind them did not exist. This migration creates
   them, each owned by the signed-in user so entries are private.

3. New Tables
   - `goal_steps`: sub-steps of a goal (id, goal_id, title, done, created_at)
   - `saved_quotes`: favourite quotes (id, text, author, kind, created_at)
   - `inbox_items`: raw brain-dump notes (id, content, created_at)
   - `app_settings`: single row of app-wide settings (id, weekly_budget)

4. Security
   - RLS enabled on all four tables.
   - goal_steps readable/writable only by the owner of the parent goal.
   - saved_quotes and inbox_items readable/writable only by their owner.
   - app_settings readable/writable by any authenticated user (personal
     single-account app; the row is shared app state).

5. Important notes
   - No existing data is touched; this only adds missing tables.
*/

-- ---------- goal_steps (owner via parent goal) ----------
CREATE TABLE IF NOT EXISTS goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE goal_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_goal_steps" ON goal_steps;
CREATE POLICY "select_own_goal_steps" ON goal_steps FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_own_goal_steps" ON goal_steps;
CREATE POLICY "insert_own_goal_steps" ON goal_steps FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
);

DROP POLICY IF EXISTS "update_own_goal_steps" ON goal_steps;
CREATE POLICY "update_own_goal_steps" ON goal_steps FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
);

DROP POLICY IF EXISTS "delete_own_goal_steps" ON goal_steps;
CREATE POLICY "delete_own_goal_steps" ON goal_steps FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_goal_steps_goal ON goal_steps (goal_id);

-- ---------- saved_quotes ----------
CREATE TABLE IF NOT EXISTS saved_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'quote',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_quotes" ON saved_quotes;
CREATE POLICY "select_own_saved_quotes" ON saved_quotes FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_quotes" ON saved_quotes;
CREATE POLICY "insert_own_saved_quotes" ON saved_quotes FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_quotes" ON saved_quotes;
CREATE POLICY "update_own_saved_quotes" ON saved_quotes FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_quotes" ON saved_quotes;
CREATE POLICY "delete_own_saved_quotes" ON saved_quotes FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ---------- inbox_items ----------
CREATE TABLE IF NOT EXISTS inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_inbox_items" ON inbox_items;
CREATE POLICY "select_own_inbox_items" ON inbox_items FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_inbox_items" ON inbox_items;
CREATE POLICY "insert_own_inbox_items" ON inbox_items FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_inbox_items" ON inbox_items;
CREATE POLICY "update_own_inbox_items" ON inbox_items FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_inbox_items" ON inbox_items;
CREATE POLICY "delete_own_inbox_items" ON inbox_items FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ---------- app_settings ----------
CREATE TABLE IF NOT EXISTS app_settings (
  id text PRIMARY KEY,
  weekly_budget integer NOT NULL DEFAULT 0
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_app_settings" ON app_settings;
CREATE POLICY "authenticated_all_app_settings" ON app_settings
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_app_settings" ON app_settings;
CREATE POLICY "authenticated_insert_app_settings" ON app_settings
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_app_settings" ON app_settings;
CREATE POLICY "authenticated_update_app_settings" ON app_settings
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_app_settings" ON app_settings;
CREATE POLICY "authenticated_delete_app_settings" ON app_settings
FOR DELETE TO authenticated USING (true);
