/*
# Add private_password_hash column to app_settings

1. Title
   Adds a column to store a single shared password hash for the Private
   notepad category.

2. Plain-English explanation
   Private notes now use one shared password instead of a password per note.
   The hash is stored in the app_settings table in a new column. This is
   non-destructive: existing notes keep their per-note password_hash column,
   but the UI now uses the shared password to unlock all private notes at once.

3. Modified Tables
   - app_settings: adds private_password_hash (text, nullable, default '')

4. Security
   - No new tables. RLS already enabled on app_settings.
   - Existing policies still apply (authenticated-only CRUD).

5. Important notes
   - No data is lost; the new column defaults to empty string.
*/

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS private_password_hash text NOT NULL DEFAULT '';
