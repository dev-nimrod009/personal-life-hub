/*
# Add delete policy for profiles

1. Title
   Adds the missing DELETE policy on profiles so users can remove
   their own profile row.

2. Plain-English explanation
   The profiles table had SELECT, INSERT, and UPDATE policies but no
   DELETE policy. Users could create and edit their profile but never
   delete it. This adds the missing policy.

3. Modified Tables
   - profiles: adds delete_own_profile policy

4. Security
   - Scoped to auth.uid() = id, matching the existing policies.
*/

CREATE POLICY "delete_own_profile" ON profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);
