/*
# Add meal library, recipes, pantry, shopping list, and general budget tables

1. Title
   Creates five new tables that power the redesigned meal planner and the
   new general budget section:
   - meal_library   : reusable meal templates the user picks from to plan weeks
   - recipes        : meal name + ingredients + instructions for cooking
   - pantry_items   : items in the house (with quantity and a "need to buy" flag)
   - shopping_list  : items the user needs to buy (name, qty, est. cost, bought)
   - budget_items   : general personal finance items (income or expense, amount, category, note, date)

2. Plain-English explanation
   - Meal planner becomes weekly: the user picks meals from a library of meals
     they already saved, instead of typing each one each day. Recipes can be
     attached to any meal in the library and show ingredients + steps to cook.
   - Pantry lists items in the house and a checkbox marks "need to buy".
   - Shopping list captures items to buy with estimated cost.
   - Budget is a general personal finance tracker separate from the meal
     planner's weekly shopping summary. It supports income and expenses with
     categories and notes, and computes totals.

3. New Tables
   - meal_library: id, name, meal_type, default_cost, emoji, notes, recipe_id, created_at
   - recipes: id, title, ingredients (text), instructions (text), servings, created_at
   - pantry_items: id, name, quantity, unit, need_to_buy, created_at
   - shopping_list: id, name, quantity, est_cost, bought, created_at
   - budget_items: id, kind ('income'|'expense'), amount, category, note, item_date, created_at

4. Security
   - RLS enabled on all five tables.
   - Each table is owner-scoped: user_id uuid NOT NULL DEFAULT auth.uid()
     with four owner CRUD policies (select/insert/update/delete).

5. Important notes
   - No existing tables are altered or dropped; this only adds new ones.
   - meal_library.recipe_id is nullable and references recipes(id) ON DELETE SET NULL
     so deleting a recipe does not delete the meal that referenced it.
*/

-- ---------- recipes ----------
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  ingredients text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  servings integer NOT NULL DEFAULT 1,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_recipes" ON recipes;
CREATE POLICY "select_own_recipes" ON recipes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_recipes" ON recipes;
CREATE POLICY "insert_own_recipes" ON recipes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_recipes" ON recipes;
CREATE POLICY "update_own_recipes" ON recipes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_recipes" ON recipes;
CREATE POLICY "delete_own_recipes" ON recipes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- meal_library ----------
CREATE TABLE IF NOT EXISTS meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  meal_type text NOT NULL DEFAULT 'Dinner',
  default_cost integer NOT NULL DEFAULT 0,
  emoji text NOT NULL DEFAULT '🍽️',
  notes text NOT NULL DEFAULT '',
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_library" ON meal_library;
CREATE POLICY "select_own_meal_library" ON meal_library FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meal_library" ON meal_library;
CREATE POLICY "insert_own_meal_library" ON meal_library FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meal_library" ON meal_library;
CREATE POLICY "update_own_meal_library" ON meal_library FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meal_library" ON meal_library;
CREATE POLICY "delete_own_meal_library" ON meal_library FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meal_library_user ON meal_library (user_id);

-- ---------- pantry_items ----------
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  need_to_buy boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pantry_items" ON pantry_items;
CREATE POLICY "select_own_pantry_items" ON pantry_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pantry_items" ON pantry_items;
CREATE POLICY "insert_own_pantry_items" ON pantry_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pantry_items" ON pantry_items;
CREATE POLICY "update_own_pantry_items" ON pantry_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pantry_items" ON pantry_items;
CREATE POLICY "delete_own_pantry_items" ON pantry_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- shopping_list ----------
CREATE TABLE IF NOT EXISTS shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity text NOT NULL DEFAULT '',
  est_cost integer NOT NULL DEFAULT 0,
  bought boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_shopping_list" ON shopping_list;
CREATE POLICY "select_own_shopping_list" ON shopping_list FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_shopping_list" ON shopping_list;
CREATE POLICY "insert_own_shopping_list" ON shopping_list FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_shopping_list" ON shopping_list;
CREATE POLICY "update_own_shopping_list" ON shopping_list FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_shopping_list" ON shopping_list;
CREATE POLICY "delete_own_shopping_list" ON shopping_list FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------- budget_items ----------
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'expense',
  amount integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  item_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_budget_items" ON budget_items;
CREATE POLICY "select_own_budget_items" ON budget_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_budget_items" ON budget_items;
CREATE POLICY "insert_own_budget_items" ON budget_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_budget_items" ON budget_items;
CREATE POLICY "update_own_budget_items" ON budget_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_budget_items" ON budget_items;
CREATE POLICY "delete_own_budget_items" ON budget_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_user_date ON budget_items (user_id, item_date DESC);
