export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: string;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  category: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface DayPlanTask {
  id: string;
  plan_date: string;
  task: string;
  done: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  done: boolean;
}

export interface Meal {
  id: string;
  meal_date: string;
  meal_type: string;
  name: string;
  notes: string;
  cost: number | null;
  created_at: string;
}

export interface Mood {
  id: string;
  mood_date: string;
  score: number;
  note: string;
}

export interface WaterIntake {
  id: string;
  intake_date: string;
  glasses: number;
  goal: number;
}

export interface GratitudeEntry {
  id: string;
  entry_date: string;
  content: string;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  done: boolean;
  timeframe: string;
  created_at: string;
  updated_at: string;
}

export interface InboxItem {
  id: string;
  content: string;
  created_at: string;
}

export interface GoalStep {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  created_at: string;
}

export interface SavedQuote {
  id: string;
  text: string;
  author: string;
  kind: string;
  created_at: string;
}

export interface GoalStep {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  location: string;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  servings: number;
  created_at: string;
}

export interface MealLibraryItem {
  id: string;
  name: string;
  meal_type: string;
  default_cost: number;
  emoji: string;
  notes: string;
  recipe_id: string | null;
  created_at: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  need_to_buy: boolean;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  est_cost: number;
  bought: boolean;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  kind: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  item_date: string;
  created_at: string;
}
