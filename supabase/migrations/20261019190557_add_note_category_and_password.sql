/*
# Notes: add category and optional password protection

1. Title
   Adds a category and a password hash to notes so entries can be
   organised (Personal, Work, Ideas) and optionally locked behind a
   password (Private, Hidden).

2. Plain-English explanation
   Each note can now carry a category label and, if the user sets one,
   a password. The password is stored as a SHA-256 hash. Notes with a
   password show locked in the list until the correct password is
   entered; their title and content are hidden until unlocked.

3. Modified Tables
   - `notes`
     - `category` (text, default 'personal')
     - `password_hash` (text, default '' — empty means no password)

4. Security
   - No change to RLS — owner-only policies already in place.
   - The password hash is stored alongside the note; content is gated
     by the UI, not encrypted at rest.
*/

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'personal';

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
