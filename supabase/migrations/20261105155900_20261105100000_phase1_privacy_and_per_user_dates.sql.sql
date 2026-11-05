/*
# Close public access to private tables and make date entries per user

## Plain-English summary
Four tables (journal, diary, gratitude, water) still had open "anyone can read and write" policies from an early version of the app. Because policies combine, those open rules let any visitor with the public app key read, change, or delete every user's entries. This migration removes those rules so each person only sees their own rows. It also changes the one-entry-per-day rule for diary, mood and water from "one per day across all users" to "one per day per user", so a second account can no longer block the first.

## Changes
1. Dropped the open anon_* policies on journal_entries, diary_entries, gratitude_entries and water_intake.
2. Revoked anonymous (public key) privileges on all app tables. Signed-in owner policies remain unchanged.
3. Replaced the global unique date constraints on diary_entries, moods and water_intake with unique (user_id, date).

## Security
- Owner-only RLS policies (auth.uid() = user_id) are the only access path after this migration.
- No data is deleted or altered; only policies, grants and constraints change.

## Notes
- Idempotent: policy drops use IF EXISTS, and constraint swaps check pg_constraint before adding.
*/

DROP POLICY IF EXISTS "anon_select_journal" ON journal_entries;
DROP POLICY IF EXISTS "anon_insert_journal" ON journal_entries;
DROP POLICY IF EXISTS "anon_update_journal" ON journal_entries;
DROP POLICY IF EXISTS "anon_delete_journal" ON journal_entries;

DROP POLICY IF EXISTS "anon_select_diary" ON diary_entries;
DROP POLICY IF EXISTS "anon_insert_diary" ON diary_entries;
DROP POLICY IF EXISTS "anon_update_diary" ON diary_entries;
DROP POLICY IF EXISTS "anon_delete_diary" ON diary_entries;

DROP POLICY IF EXISTS "anon_select_gratitude" ON gratitude_entries;
DROP POLICY IF EXISTS "anon_insert_gratitude" ON gratitude_entries;
DROP POLICY IF EXISTS "anon_update_gratitude" ON gratitude_entries;
DROP POLICY IF EXISTS "anon_delete_gratitude" ON gratitude_entries;

DROP POLICY IF EXISTS "anon_select_water" ON water_intake;
DROP POLICY IF EXISTS "anon_insert_water" ON water_intake;
DROP POLICY IF EXISTS "anon_update_water" ON water_intake;
DROP POLICY IF EXISTS "anon_delete_water" ON water_intake;

REVOKE ALL ON journal_entries, diary_entries, gratitude_entries, water_intake, moods, notes, habits, habit_logs, goals, goal_steps, budget_items, shopping_list, meals, meal_library, recipes, pantry_items, reminders, inbox_items, day_plans, saved_quotes, profiles, app_settings FROM anon;

ALTER TABLE diary_entries DROP CONSTRAINT IF EXISTS diary_entries_entry_date_key;
ALTER TABLE moods DROP CONSTRAINT IF EXISTS moods_mood_date_key;
ALTER TABLE water_intake DROP CONSTRAINT IF EXISTS water_intake_intake_date_key;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diary_entries_user_date_key') THEN
    ALTER TABLE diary_entries ADD CONSTRAINT diary_entries_user_date_key UNIQUE (user_id, entry_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moods_user_date_key') THEN
    ALTER TABLE moods ADD CONSTRAINT moods_user_date_key UNIQUE (user_id, mood_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'water_intake_user_date_key') THEN
    ALTER TABLE water_intake ADD CONSTRAINT water_intake_user_date_key UNIQUE (user_id, intake_date);
  END IF;
END $$;
