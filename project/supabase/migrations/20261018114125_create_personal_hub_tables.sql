/*
# Personal Hub - core tables

1. Title
   Creates all tables for the personal hub app: journal, diary, notes,
   day plans, reminders, habits, meals, moods, water, gratitude, goals.

2. Plain-English explanation
   Each feature gets its own table so entries are independent and safe to
   change. All timestamps use UTC. Entries are ordered by newest first in
   the app.

3. New Tables
   - `journal_entries`: id, title, content, mood, created_at, updated_at
   - `diary_entries`: id, entry_date, content, created_at, updated_at
   - `notes`: id, title, content, pinned, created_at, updated_at
   - `day_plans`: id, plan_date, task, done, created_at
   - `reminders`: id, title, notes, due_at, done, created_at
   - `habits`: id, name, icon, color, created_at
   - `habit_logs`: id, habit_id, log_date, done
   - `meals`: id, meal_date, meal_type, name, notes, created_at
   - `moods`: id, mood_date, score (1-5), note
   - `water_intake`: id, intake_date, glasses, goal
   - `gratitude_entries`: id, entry_date, content, created_at
   - `goals`: id, title, description, target, current, done, created_at, updated_at

4. Security
   - RLS enabled on every table.
   - Single-tenant app with no sign-in, so all policies are
     TO anon, authenticated with USING (true) / WITH CHECK (true).
   - This is intentional: the app is a private personal hub used on one
     device without accounts.
*/

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS day_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date date NOT NULL,
  task text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '✓',
  color text NOT NULL DEFAULT 'teal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_date date NOT NULL,
  meal_type text NOT NULL,
  name text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood_date date NOT NULL UNIQUE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  note text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS water_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_date date NOT NULL UNIQUE,
  glasses integer NOT NULL DEFAULT 0,
  goal integer NOT NULL DEFAULT 8
);

CREATE TABLE IF not EXISTS gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target integer NOT NULL DEFAULT 100,
  current integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_journal" ON journal_entries;
CREATE POLICY "anon_select_journal" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_journal" ON journal_entries;
CREATE POLICY "anon_insert_journal" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_journal" ON journal_entries;
CREATE POLICY "anon_update_journal" ON journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_journal" ON journal_entries;
CREATE POLICY "anon_delete_journal" ON journal_entries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_diary" ON diary_entries;
CREATE POLICY "anon_select_diary" ON diary_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_diary" ON diary_entries;
CREATE POLICY "anon_insert_diary" ON diary_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_diary" ON diary_entries;
CREATE POLICY "anon_update_diary" ON diary_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_diary" ON diary_entries;
CREATE POLICY "anon_delete_diary" ON diary_entries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_notes" ON notes;
CREATE POLICY "anon_select_notes" ON notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notes" ON notes;
CREATE POLICY "anon_update_notes" ON notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_day_plans" ON day_plans;
CREATE POLICY "anon_select_day_plans" ON day_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_day_plans" ON day_plans;
CREATE POLICY "anon_insert_day_plans" ON day_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_day_plans" ON day_plans;
CREATE POLICY "anon_update_day_plans" ON day_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_day_plans" ON day_plans;
CREATE POLICY "anon_delete_day_plans" ON day_plans FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_reminders" ON reminders;
CREATE POLICY "anon_select_reminders" ON reminders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reminders" ON reminders;
CREATE POLICY "anon_insert_reminders" ON reminders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reminders" ON reminders;
CREATE POLICY "anon_update_reminders" ON reminders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reminders" ON reminders;
CREATE POLICY "anon_delete_reminders" ON reminders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_habits" ON habits;
CREATE POLICY "anon_select_habits" ON habits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_habits" ON habits;
CREATE POLICY "anon_insert_habits" ON habits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_habits" ON habits;
CREATE POLICY "anon_update_habits" ON habits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_habits" ON habits;
CREATE POLICY "anon_delete_habits" ON habits FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_habit_logs" ON habit_logs;
CREATE POLICY "anon_select_habit_logs" ON habit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_habit_logs" ON habit_logs;
CREATE POLICY "anon_insert_habit_logs" ON habit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_habit_logs" ON habit_logs;
CREATE POLICY "anon_update_habit_logs" ON habit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_habit_logs" ON habit_logs;
CREATE POLICY "anon_delete_habit_logs" ON habit_logs FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_meals" ON meals;
CREATE POLICY "anon_select_meals" ON meals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_meals" ON meals;
CREATE POLICY "anon_insert_meals" ON meals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_meals" ON meals;
CREATE POLICY "anon_update_meals" ON meals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_meals" ON meals;
CREATE POLICY "anon_delete_meals" ON meals FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_moods" ON moods;
CREATE POLICY "anon_select_moods" ON moods FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_moods" ON moods;
CREATE POLICY "anon_insert_moods" ON moods FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_moods" ON moods;
CREATE POLICY "anon_update_moods" ON moods FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_moods" ON moods;
CREATE POLICY "anon_delete_moods" ON moods FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_water" ON water_intake;
CREATE POLICY "anon_select_water" ON water_intake FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_water" ON water_intake;
CREATE POLICY "anon_insert_water" ON water_intake FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_water" ON water_intake;
CREATE POLICY "anon_update_water" ON water_intake FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_water" ON water_intake;
CREATE POLICY "anon_delete_water" ON water_intake FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_gratitude" ON gratitude_entries;
CREATE POLICY "anon_select_gratitude" ON gratitude_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_gratitude" ON gratitude_entries;
CREATE POLICY "anon_insert_gratitude" ON gratitude_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_gratitude" ON gratitude_entries;
CREATE POLICY "anon_update_gratitude" ON gratitude_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_gratitude" ON gratitude_entries;
CREATE POLICY "anon_delete_gratitude" ON gratitude_entries FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_goals" ON goals;
CREATE POLICY "anon_select_goals" ON goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_goals" ON goals;
CREATE POLICY "anon_insert_goals" ON goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_goals" ON goals;
CREATE POLICY "anon_update_goals" ON goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_goals" ON goals;
CREATE POLICY "anon_delete_goals" ON goals FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_day_plans_date ON day_plans (plan_date);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals (meal_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs (log_date);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (due_at);
