/*
# Add missing columns: meals.cost, goals.timeframe

1. Title
   Adds cost to meals and timeframe to goals — both columns the
   application code already writes to but the schema was missing.

2. Plain-English explanation
   The meal planner records a cost per meal (in KSh) but the meals
   table never had that column, so every insert with a cost silently
   dropped it. Goals have a timeframe field the app updates, but the
   column was absent. Both are added here, non-destructively.

3. Modified Tables
   - meals: adds cost integer (nullable, default null)
   - goals: adds timeframe text (NOT NULL default '')

4. Security
   - No new tables. RLS already enabled on both tables.
   - Existing policies still apply.

5. Important notes
   - No data is lost; new columns default to null / empty string.
*/

ALTER TABLE meals ADD COLUMN IF NOT EXISTS cost integer;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS timeframe text NOT NULL DEFAULT '';
