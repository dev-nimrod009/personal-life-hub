-- ====================================================================
-- LIFE HUB - COMPLETE CONSOLIDATED SUPABASE SCHEMA (FINAL FIXED)
-- Copy this entire file and run it in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New query -> Paste & Run
-- ====================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- 2. Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Diary Entries (one per day per user)
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- 4. Notes
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  pinned boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'General',
  password_hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Day Plans (Tasks)
CREATE TABLE IF NOT EXISTS public.day_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  task text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  due_at timestamptz,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Habit Logs
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, habit_id, log_date)
);

-- 9. Meals
CREATE TABLE IF NOT EXISTS public.meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  meal_type text NOT NULL DEFAULT 'Lunch',
  name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Moods
CREATE TABLE IF NOT EXISTS public.moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_date date NOT NULL,
  score integer NOT NULL DEFAULT 3,
  note text NOT NULL DEFAULT '',
  UNIQUE (user_id, mood_date)
);

-- 11. Water Intake
CREATE TABLE IF NOT EXISTS public.water_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_date date NOT NULL,
  glasses integer NOT NULL DEFAULT 0,
  goal integer NOT NULL DEFAULT 8,
  UNIQUE (user_id, intake_date)
);

-- 12. Gratitude Entries
CREATE TABLE IF NOT EXISTS public.gratitude_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Goals
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  target integer NOT NULL DEFAULT 100,
  current integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  timeframe text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 14. Goal Steps (Owned via parent goal)
CREATE TABLE IF NOT EXISTS public.goal_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Saved Quotes
CREATE TABLE IF NOT EXISTS public.saved_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'quote',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 16. Inbox Items (Brain Dump)
CREATE TABLE IF NOT EXISTS public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 17. Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  ingredients text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  servings integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 18. Meal Library
CREATE TABLE IF NOT EXISTS public.meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'Dinner',
  default_cost integer NOT NULL DEFAULT 0,
  emoji text NOT NULL DEFAULT '🍽️',
  notes text NOT NULL DEFAULT '',
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 19. Pantry Items
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  need_to_buy boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 20. Shopping List
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity text NOT NULL DEFAULT '',
  est_cost integer NOT NULL DEFAULT 0,
  bought boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 21. Budget Items
CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'expense',
  amount integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  item_date date NOT NULL DEFAULT CURRENT_DATE,
  planned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 22. App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_budget integer DEFAULT 0,
  private_password_hash text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ====================================================================
-- RLS POLICIES FOR ALL CORE TABLES
-- ====================================================================

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Standard user_id ownership policies
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'journal_entries', 'diary_entries', 'notes', 'day_plans',
    'reminders', 'habits', 'habit_logs', 'meals', 'moods',
    'water_intake', 'gratitude_entries', 'goals',
    'saved_quotes', 'inbox_items', 'recipes', 'meal_library',
    'pantry_items', 'shopping_list', 'budget_items', 'app_settings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "select_own_%s" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "insert_own_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "update_own_%s" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "delete_own_%s" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- Parent-owned policy for goal_steps
DROP POLICY IF EXISTS "select_own_goal_steps" ON public.goal_steps;
CREATE POLICY "select_own_goal_steps" ON public.goal_steps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_goal_steps" ON public.goal_steps;
CREATE POLICY "insert_own_goal_steps" ON public.goal_steps FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_goal_steps" ON public.goal_steps;
CREATE POLICY "update_own_goal_steps" ON public.goal_steps FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_goal_steps" ON public.goal_steps;
CREATE POLICY "delete_own_goal_steps" ON public.goal_steps FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()));
