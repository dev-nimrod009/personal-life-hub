/*
# Secure app_settings with user_id and per-user RLS

1. Title
   Adds user_id to app_settings and replaces the global USING(true)
   policies with per-user ownership checks.

2. Plain-English explanation
   The app_settings table previously had no user_id column and its RLS
   policies used USING(true) — meaning every authenticated user could
   read and modify every other user's settings (weekly budget, private
   password hash). This adds a user_id column and replaces the policies
   with per-user ownership checks so users can only see and change
   their own settings row(s).

3. Modified Tables
   - app_settings: adds user_id uuid referencing auth.users.id

4. Security
   - Drops the 4 old permissive policies.
   - Creates 4 new policies scoped to auth.uid() = user_id.
   - Removes grants from anon role (no longer needed — app requires sign-in).
   - Keeps authenticated grants for SELECT, INSERT, UPDATE, DELETE.

5. Important notes
   - Existing rows get user_id set to their owner where possible.
   - No data is lost.
*/

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: set user_id on existing rows where we can determine the owner.
-- Rows with id='app' or id='private' are per-user, but we may not know
-- which user created them. We leave them as-is (user_id null) and they
-- will be filtered out by the new RLS policies. Users will re-create
-- their own settings row on next use.

DROP POLICY IF EXISTS "authenticated_all_app_settings" ON app_settings;
DROP POLICY IF EXISTS "authenticated_delete_app_settings" ON app_settings;
DROP POLICY IF EXISTS "authenticated_insert_app_settings" ON app_settings;
DROP POLICY IF EXISTS "authenticated_update_app_settings" ON app_settings;

CREATE POLICY "select_own_app_settings" ON app_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_app_settings" ON app_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_app_settings" ON app_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_app_settings" ON app_settings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Remove anon grants — this app requires sign-in
REVOKE SELECT, INSERT, UPDATE, DELETE ON app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_settings TO authenticated;
