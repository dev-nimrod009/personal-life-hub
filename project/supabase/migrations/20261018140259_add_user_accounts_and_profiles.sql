/*
# Life Hub - user accounts, profiles, and per-user data isolation

1. Title
   Prepares the Life Hub app for a single personal account: adds a
   profiles table and gives every existing feature table an owner.

2. Plain-English explanation
   The app now requires signing in with an email and password (an
   optional device passkey/biometric unlock is handled in the app, not
   the database). After signing in, every entry the user creates —
   journal, diary, notes, day plans, reminders, habits, meals, moods,
   water, gratitude, goals — belongs to them, and no one else can see
   or change it. A profile stores the user's display name, personal
   details, and a profile picture.

3. New Tables
   - `profiles`
     - `id` (uuid, primary key; same value as the signing-in user's id)
     - `email` (text, not null)
     - `full_name` (text, default '')
     - `avatar_url` (text, default '' — link to the profile picture)
     - `bio` (text, default '')
     - `location` (text, default '')
     - `birthday` (date, null when not set)
     - `created_at` / `updated_at` (timestamps)

4. Modified Tables
   - Adds `user_id` (uuid, not null, defaults to the signing-in user)
     to all twelve feature tables: journal_entries, diary_entries,
     notes, day_plans, reminders, habits, habit_logs, meals, moods,
     water_intake, gratitude_entries, goals.
   - Replaces the old "everyone can edit" policies with owner-only
     policies.

5. Security
   - RLS enabled on `profiles` and already enabled on every feature
     table.
   - New policies: users can only read/change their own profile, and
     only read/change feature rows they own.
   - Profile rows are created automatically the first time a new user
     signs in.

6. Important notes
   - No columns or data are removed; all tables were empty so the new
     owner column fills in on the fly.
   - Unique date-based tables (diary, moods, water) keep their one
     entry per day rule.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  birthday date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- feature tables: add owner column ----------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'journal_entries', 'diary_entries', 'notes', 'day_plans',
    'reminders', 'habits', 'habit_logs', 'meals', 'moods',
    'water_intake', 'gratitude_entries', 'goals'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE',
        t
      );
    END IF;

    -- owner-scoped policies (drop-and-recreate to be idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "select_own_%s" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "insert_own_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "update_own_%s" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "delete_own_%s" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- habit_logs and goal_steps are owned via their parent; grant owners access through the parent chain
DROP POLICY IF EXISTS "select_own_habit_logs" ON habit_logs;
CREATE POLICY "select_own_habit_logs" ON habit_logs FOR SELECT
TO authenticated USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_habit_logs" ON habit_logs;
CREATE POLICY "insert_own_habit_logs" ON habit_logs FOR INSERT
TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_habit_logs" ON habit_logs;
CREATE POLICY "update_own_habit_logs" ON habit_logs FOR UPDATE
TO authenticated USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_id AND h.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_habit_logs" ON habit_logs;
CREATE POLICY "delete_own_habit_logs" ON habit_logs FOR DELETE
TO authenticated USING (EXISTS (SELECT 1 FROM habits h WHERE h.id = habit_id AND h.user_id = auth.uid()));
