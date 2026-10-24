ALTER TABLE budget_items
  ADD COLUMN IF NOT EXISTS planned boolean NOT NULL DEFAULT false;
