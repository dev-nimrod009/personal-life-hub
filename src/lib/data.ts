import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  JournalEntry,
  DiaryEntry,
  Note,
  DayPlanTask,
  Reminder,
  Habit,
  HabitLog,
  Meal,
  Mood,
  WaterIntake,
  GratitudeEntry,
  Goal,
  GoalStep,
  SavedQuote,
  Profile,
  InboxItem,
  Recipe,
  MealLibraryItem,
  PantryItem,
  ShoppingItem,
  BudgetItem,
} from "./types";
import { todayISO } from "./utils";
import { getStoredValue, setStoredValue } from "./storage";

type Row = Record<string, unknown>;

// ---------- offline storage ----------

const QUEUE_KEY = "lifehub:sync-queue";
const cacheKey = (table: string) => `lifehub:cache:${table}`;

function readLocal(table: string): Row[] {
  try {
    const parsed: unknown = JSON.parse(getStoredValue(cacheKey(table)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((row): row is Row => typeof row === "object" && row !== null && !Array.isArray(row))
      : [];
  } catch {
    return [];
  }
}

function writeLocal(table: string, rows: Row[]): void {
  try {
    setStoredValue(cacheKey(table), JSON.stringify(rows));
  } catch {
    // storage full or unavailable - cloud remains the source of truth
  }
}

interface SyncItem {
  ts: number;
  table: string;
  kind: "insert" | "update" | "delete";
  row: Row;
  changes?: Record<string, unknown>;
}

function readQueue(): SyncItem[] {
  try {
    const parsed: unknown = JSON.parse(getStoredValue(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is SyncItem =>
            typeof item === "object" &&
            item !== null &&
            "table" in item &&
            typeof item.table === "string" &&
            "kind" in item &&
            (item.kind === "insert" || item.kind === "update" || item.kind === "delete") &&
            "row" in item &&
            typeof item.row === "object" &&
            item.row !== null
        )
      : [];
  } catch {
    return [];
  }
}

function writeQueue(items: SyncItem[]): void {
  try {
    setStoredValue(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // nothing we can do, keep the in-memory state consistent
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

let syncing = false;
const syncListeners = new Set<(syncing: boolean, pending: number) => void>();

export function onSyncStatus(fn: (syncing: boolean, pending: number) => void): () => void {
  syncListeners.add(fn);
  fn(syncing, readQueue().length);
  return () => syncListeners.delete(fn);
}

function notify(): void {
  for (const fn of syncListeners) fn(syncing, readQueue().length);
}

async function runRemote(item: SyncItem): Promise<void> {
  if (item.kind === "insert") {
    const { error } = await supabase.from(item.table).insert(item.row);
    if (error) throw new Error(error.message);
  } else if (item.kind === "update") {
    const { error } = await supabase.from(item.table).update(item.changes ?? {}).eq("id", item.row.id as string);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from(item.table).delete().eq("id", item.row.id as string);
    if (error) throw new Error(error.message);
  }
}

function looksOffline(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (typeof navigator !== "undefined" && !navigator.onLine) || /fetch|network|load failed|timed? ?out|failed to fetch/i.test(msg);
}

export async function checkBackendConnectivity(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!navigator.onLine || !url || !anonKey) return false;

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function remoteOrQueue(item: Omit<SyncItem, "ts">): Promise<void> {
  writeLocalForItem(item);
  if (!isSupabaseConfigured) {
    notify();
    return;
  }
  const full: SyncItem = { ...item, ts: Date.now() };
  try {
    await runRemote(item.kind === "update" ? { ...full, changes: full.changes ?? {} } : full);
    notify();
  } catch (e) {
    if (!looksOffline(e)) throw e;
    writeQueue([...readQueue(), full]);
    notify();
  }
}

function writeLocalForItem(item: Omit<SyncItem, "ts">): void {
  const rows = [...readLocal(item.table)];
  const id = item.row.id as string;
  if (item.kind === "insert") {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) rows[idx] = item.row;
    else rows.push(item.row);
  } else if (item.kind === "update") {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) rows[idx] = { ...rows[idx], ...(item.changes ?? {}) };
    else rows.push({ ...item.row, ...(item.changes ?? {}) });
  } else {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) rows.splice(idx, 1);
  }
  writeLocal(item.table, rows);
}

export async function flushSync(): Promise<void> {
  if (syncing) return;
  const items = readQueue();
  if (items.length === 0) return;
  syncing = true;
  notify();
  const remaining: SyncItem[] = [];
  for (const item of items) {
    try {
      await runRemote(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  syncing = false;
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushSync());
  window.setInterval(() => {
    if (navigator.onLine) void flushSync();
  }, 15000);
  void flushSync();
}

// ---------- offline-aware reads ----------

async function fetchAll(table: string): Promise<Row[]> {
  if (!isSupabaseConfigured) {
    return readLocal(table);
  }
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    const ids = new Set(rows.map((r) => r.id));
    const cache = cacheWithoutRemoteDeleted(table, ids);
    writeLocal(table, [...rows, ...cache]);
    return [...rows, ...cache];
  } catch (e) {
    // Any read failure (offline, flaky network, timeout) falls back to the last
    // saved copy on this device so the app is always usable offline.
    const cached = readLocal(table);
    if (cached.length > 0 || looksOffline(e)) return cached;
    throw e;
  }
}

// Rows the user deleted locally (queue has a pending delete) should not reappear
// after a cloud refresh.
function cacheWithoutRemoteDeleted(table: string, cloudIds: Set<unknown>): Row[] {
  return readQueue()
    .filter((s) => s.table === table && s.kind === "delete")
    .reduce((rows, s) => rows.filter((r) => r.id !== s.row.id), readLocal(table).filter((r) => !cloudIds.has(r.id)));
}

function byDateDesc(a: Row, b: Row): number {
  return String(b.entry_date ?? "").localeCompare(String(a.entry_date ?? ""));
}

// ---------- profile ----------

export async function getProfile(userId: string, email?: string): Promise<Profile | null> {
  const rows = await fetchAll("profiles");
  const own = rows.find((r) => r.id === userId);
  if (own) {
    return {
      id: userId,
      email: String(own.email ?? ""),
      full_name: String(own.full_name ?? ""),
      avatar_url: String(own.avatar_url ?? ""),
      bio: String(own.bio ?? ""),
      location: String(own.location ?? ""),
      birthday: typeof own.birthday === "string" ? own.birthday : null,
      created_at: String(own.created_at ?? new Date().toISOString()),
      updated_at: String(own.updated_at ?? new Date().toISOString()),
    };
  }
  const profileEmail = email ?? (await supabase.auth.getUser()).data.user?.email;
  if (!profileEmail) return null;
  const now = new Date().toISOString();
  const row = {
    id: userId,
    email: profileEmail,
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    birthday: null,
    created_at: now,
    updated_at: now,
  };
  await remoteOrQueue({ table: "profiles", kind: "insert", row });
  return row as Profile;
}

export async function updateProfile(userId: string, changes: Partial<Profile>): Promise<void> {
  await remoteOrQueue({
    table: "profiles",
    kind: "update",
    row: { id: userId },
    changes: { ...changes, updated_at: new Date().toISOString() },
  });
}

// ---------- journal ----------

export async function listJournal(): Promise<JournalEntry[]> {
  const rows = await fetchAll("journal_entries");
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((r) => r as unknown as JournalEntry);
}

export async function upsertJournal(entry: { id?: string; title: string; content: string; mood: string }): Promise<void> {
  if (entry.id) {
    await remoteOrQueue({
      table: "journal_entries",
      kind: "update",
      row: { id: entry.id },
      changes: {
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        updated_at: new Date().toISOString(),
      },
    });
  } else {
    await remoteOrQueue({
      table: "journal_entries",
      kind: "insert",
      row: {
        id: uid(),
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }
}

export async function deleteJournal(id: string): Promise<void> {
  await remoteOrQueue({ table: "journal_entries", kind: "delete", row: { id } });
}

// ---------- diary ----------

export async function listDiary(): Promise<DiaryEntry[]> {
  const rows = await fetchAll("diary_entries");
  return rows.sort(byDateDesc).map((r) => r as unknown as DiaryEntry);
}

export async function getDiaryByDate(date: string): Promise<DiaryEntry | null> {
  const rows = await fetchAll("diary_entries");
  const row = rows.find((r) => r.entry_date === date);
  return row ? (row as unknown as DiaryEntry) : null;
}

export async function upsertDiary(date: string, content: string, existingId?: string | null): Promise<void> {
  const rows = await fetchAll("diary_entries");
  const row = existingId ? rows.find((r) => r.id === existingId) : rows.find((r) => r.entry_date === date);
  if (row) {
    await remoteOrQueue({
      table: "diary_entries",
      kind: "update",
      row: { id: row.id },
      changes: { entry_date: date, content, updated_at: new Date().toISOString() },
    });
  } else {
    await remoteOrQueue({ table: "diary_entries", kind: "insert", row: { id: uid(), entry_date: date, content } });
  }
}

export async function deleteDiary(id: string): Promise<void> {
  await remoteOrQueue({ table: "diary_entries", kind: "delete", row: { id } });
}

// ---------- notepad ----------

export async function listNotes(): Promise<Note[]> {
  const rows = await fetchAll("notes");
  return rows
    .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
    .map((r) => r as unknown as Note);
}

export async function upsertNote(entry: {
  id?: string;
  title: string;
  content: string;
  category?: string;
  password_hash?: string;
  pinned?: boolean;
}): Promise<void> {
  const changes: Record<string, unknown> = {
    title: entry.title,
    content: entry.content,
    category: entry.category ?? "personal",
    password_hash: entry.password_hash ?? "",
    ...(entry.pinned !== undefined ? { pinned: entry.pinned } : {}),
    updated_at: new Date().toISOString(),
  };
  if (entry.id) {
    await remoteOrQueue({
      table: "notes",
      kind: "update",
      row: { id: entry.id },
      changes,
    });
  } else {
    await remoteOrQueue({ table: "notes", kind: "insert", row: { id: uid(), ...changes } });
  }
}

export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  await remoteOrQueue({
    table: "notes",
    kind: "update",
    row: { id },
    changes: { pinned, updated_at: new Date().toISOString() },
  });
}

export async function deleteNote(id: string): Promise<void> {
  await remoteOrQueue({ table: "notes", kind: "delete", row: { id } });
}

// ---------- day planner ----------

export async function listDayPlanner(): Promise<DayPlanTask[]> {
  const rows = await fetchAll("day_plans");
  return rows
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((r) => r as unknown as DayPlanTask);
}

export async function addDayPlannerTask(task: string, plan_date: string): Promise<void> {
  await remoteOrQueue({ table: "day_plans", kind: "insert", row: { id: uid(), plan_date, task } });
}

export async function setDayPlannerDone(id: string, done: boolean): Promise<void> {
  await remoteOrQueue({ table: "day_plans", kind: "update", row: { id }, changes: { done } });
}

export async function deleteDayPlanner(id: string): Promise<void> {
  await remoteOrQueue({ table: "day_plans", kind: "delete", row: { id } });
}

export async function updateDayPlannerDate(id: string, plan_date: string): Promise<void> {
  await remoteOrQueue({ table: "day_plans", kind: "update", row: { id }, changes: { plan_date } });
}

// ---------- reminders ----------

export async function listReminders(): Promise<Reminder[]> {
  const rows = await fetchAll("reminders");
  const due = (r: Row): string => (r.due_at ? String(r.due_at) : "9999");
  return rows
    .sort((a, b) => {
      const cmd = Number(a.done ? 1 : 0) - Number(b.done ? 1 : 0);
      return cmd !== 0 ? cmd : due(a).localeCompare(due(b));
    })
    .map((r) => r as unknown as Reminder);
}

export async function upsertReminder(entry: {
  id?: string;
  title: string;
  notes: string;
  due_at: string | null;
}): Promise<void> {
  if (entry.id) {
    await remoteOrQueue({
      table: "reminders",
      kind: "update",
      row: { id: entry.id },
      changes: { title: entry.title, notes: entry.notes, due_at: entry.due_at },
    });
  } else {
    await remoteOrQueue({
      table: "reminders",
      kind: "insert",
      row: { id: uid(), title: entry.title, notes: entry.notes, due_at: entry.due_at },
    });
  }
}

export async function setReminderDone(id: string, done: boolean): Promise<void> {
  await remoteOrQueue({ table: "reminders", kind: "update", row: { id }, changes: { done } });
}

export async function deleteReminder(id: string): Promise<void> {
  await remoteOrQueue({ table: "reminders", kind: "delete", row: { id } });
}

// ---------- habits ----------

export async function listHabits(): Promise<Habit[]> {
  const rows = await fetchAll("habits");
  return rows
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((r) => r as unknown as Habit);
}

export async function listHabitLogs(): Promise<HabitLog[]> {
  const rows = await fetchAll("habit_logs");
  return rows.map((r) => r as unknown as HabitLog);
}

export async function createHabit(entry: { name: string; icon: string; color: string }): Promise<void> {
  await remoteOrQueue({ table: "habits", kind: "insert", row: { id: uid(), ...entry } });
}

export async function deleteHabit(id: string): Promise<void> {
  await remoteOrQueue({ table: "habits", kind: "delete", row: { id } });
}

export async function toggleHabitLog(habit_id: string, log_date: string): Promise<void> {
  const rows = await fetchAll("habit_logs");
  const row = rows.find((r) => r.habit_id === habit_id && r.log_date === log_date);
  if (row) {
    await remoteOrQueue({ table: "habit_logs", kind: "delete", row: { id: row.id } });
  } else {
    await remoteOrQueue({ table: "habit_logs", kind: "insert", row: { id: uid(), habit_id, log_date, done: true } });
  }
}

// ---------- meals ----------

export async function listMeals(): Promise<Meal[]> {
  const rows = await fetchAll("meals");
  return rows
    .sort((a, b) => String(a.meal_date ?? "").localeCompare(String(b.meal_date ?? "")))
    .map((r) => r as unknown as Meal);
}

export async function addMeal(entry: {
  meal_date: string;
  meal_type: string;
  name: string;
  notes: string;
  cost: number;
}): Promise<void> {
  await remoteOrQueue({
    table: "meals",
    kind: "insert",
    row: {
      id: uid(),
      meal_date: entry.meal_date,
      meal_type: entry.meal_type,
      name: entry.name,
      notes: entry.notes,
      cost: entry.cost > 0 ? entry.cost : null,
    },
  });
}

export async function deleteMeal(id: string): Promise<void> {
  await remoteOrQueue({ table: "meals", kind: "delete", row: { id } });
}

export async function updateMeal(id: string, changes: Partial<Omit<Meal, "id">>): Promise<void> {
  await remoteOrQueue({
    table: "meals",
    kind: "update",
    row: { id },
    changes,
  });
}

// ---------- mood ----------

export async function listMoods(): Promise<Mood[]> {
  const rows = await fetchAll("moods");
  return rows
    .sort((a, b) => String(b.mood_date ?? "").localeCompare(String(a.mood_date ?? "")))
    .map((r) => r as unknown as Mood);
}

export async function upsertMood(mood_date: string, score: number, note: string): Promise<void> {
  const rows = await fetchAll("moods");
  const row = rows.find((r) => r.mood_date === mood_date);
  if (row) {
    await remoteOrQueue({ table: "moods", kind: "update", row: { id: row.id }, changes: { score, note } });
  } else {
    await remoteOrQueue({ table: "moods", kind: "insert", row: { id: uid(), mood_date, score, note } });
  }
}

// ---------- water ----------

export async function listWater(): Promise<WaterIntake[]> {
  const rows = await fetchAll("water_intake");
  return rows
    .sort((a, b) => String(b.intake_date ?? "").localeCompare(String(a.intake_date ?? "")))
    .map((r) => r as unknown as WaterIntake);
}

export async function upsertWater(intake_date: string, glasses: number, goal: number): Promise<void> {
  const rows = await fetchAll("water_intake");
  const row = rows.find((r) => r.intake_date === intake_date);
  if (row) {
    await remoteOrQueue({ table: "water_intake", kind: "update", row: { id: row.id }, changes: { glasses, goal } });
  } else {
    await remoteOrQueue({ table: "water_intake", kind: "insert", row: { id: uid(), intake_date, glasses, goal } });
  }
}

// ---------- gratitude ----------

export async function listGratitude(): Promise<GratitudeEntry[]> {
  const rows = await fetchAll("gratitude_entries");
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((r) => r as unknown as GratitudeEntry);
}

export async function addGratitude(entry_date: string, content: string): Promise<void> {
  await remoteOrQueue({ table: "gratitude_entries", kind: "insert", row: { id: uid(), entry_date, content } });
}

export async function deleteGratitude(id: string): Promise<void> {
  await remoteOrQueue({ table: "gratitude_entries", kind: "delete", row: { id } });
}

// ---------- goals ----------

export async function listGoals(): Promise<Goal[]> {
  const rows = await fetchAll("goals");
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((r) => r as unknown as Goal);
}

export async function addNewGoal(entry: { title: string; description: string; target: number; timeframe?: string }): Promise<void> {
  await remoteOrQueue({
    table: "goals",
    kind: "insert",
    row: { id: uid(), title: entry.title, description: entry.description, target: entry.target, timeframe: entry.timeframe ?? "yearly" },
  });
}

export async function setGoalProgress(goal: Goal, current: number): Promise<void> {
  await remoteOrQueue({
    table: "goals",
    kind: "update",
    row: { id: goal.id },
    changes: { current, done: current >= goal.target, updated_at: new Date().toISOString() },
  });
}

export async function deleteOldGoal(id: string): Promise<void> {
  await remoteOrQueue({ table: "goals", kind: "delete", row: { id } });
}

export async function setGoalTimeframe(goal: Goal, timeframe: string): Promise<void> {
  await remoteOrQueue({
    table: "goals",
    kind: "update",
    row: { id: goal.id },
    changes: { timeframe, updated_at: new Date().toISOString() },
  });
}

export async function listGoalSteps(goal_id: string): Promise<GoalStep[]> {
  const rows = await fetchAll("goal_steps");
  return rows
    .filter((r) => r.goal_id === goal_id)
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((r) => r as unknown as GoalStep);
}

export async function listAllGoalSteps(): Promise<GoalStep[]> {
  const rows = await fetchAll("goal_steps");
  return rows
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((r) => r as unknown as GoalStep);
}

export async function addGoalStep(goal_id: string, title: string): Promise<void> {
  await remoteOrQueue({ table: "goal_steps", kind: "insert", row: { id: uid(), goal_id, title } });
}

export async function toggleGoalStepDone(step: GoalStep): Promise<void> {
  await remoteOrQueue({ table: "goal_steps", kind: "update", row: { id: step.id }, changes: { done: !step.done } });
}

export async function deleteGoalStep(id: string): Promise<void> {
  await remoteOrQueue({ table: "goal_steps", kind: "delete", row: { id } });
}

// ---------- quotes ----------

export async function listQuotes(): Promise<SavedQuote[]> {
  const rows = await fetchAll("saved_quotes");
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((r) => r as unknown as SavedQuote);
}

export async function addQuote(text: string, author: string, kind: string): Promise<void> {
  await remoteOrQueue({ table: "saved_quotes", kind: "insert", row: { id: uid(), text, author, kind } });
}

export async function deleteQuote(id: string): Promise<void> {
  await remoteOrQueue({ table: "saved_quotes", kind: "delete", row: { id } });
}

// ---------- inbox ----------

export async function listInbox(): Promise<InboxItem[]> {
  const rows = await fetchAll("inbox_items");
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((r) => r as unknown as InboxItem);
}

export async function addInboxItem(content: string): Promise<void> {
  await remoteOrQueue({ table: "inbox_items", kind: "insert", row: { id: uid(), content } });
}

export async function deleteInboxItem(id: string): Promise<void> {
  await remoteOrQueue({ table: "inbox_items", kind: "delete", row: { id } });
}

// ---------- settings ----------

export async function getWeeklyBudget(): Promise<number> {
  const rows = await fetchAll("app_settings");
  const row = rows.find((r) => r.id === "app" || r.weekly_budget != null);
  return Number(row?.weekly_budget ?? 0);
}

export async function setWeeklyBudget(amount: number): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "";
  const rows = await fetchAll("app_settings");
  const existing = rows.find((r) => r.user_id === userId && r.weekly_budget != null);
  if (existing) {
    await remoteOrQueue({
      table: "app_settings",
      kind: "update",
      row: { id: existing.id },
      changes: { weekly_budget: Math.max(0, Math.round(amount)) },
    });
  } else {
    await remoteOrQueue({
      table: "app_settings",
      kind: "insert",
      row: { id: uid(), user_id: userId, weekly_budget: Math.max(0, Math.round(amount)), private_password_hash: "" },
    });
  }
}

export async function getPrivatePasswordHash(): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "";
  const rows = await fetchAll("app_settings");
  const row = rows.find((r) => r.user_id === userId && r.private_password_hash);
  return String(row?.private_password_hash ?? "");
}

export async function setPrivatePasswordHash(hash: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "";
  const rows = await fetchAll("app_settings");
  const existing = rows.find((r) => r.user_id === userId);
  if (existing) {
    await remoteOrQueue({
      table: "app_settings",
      kind: "update",
      row: { id: existing.id },
      changes: { private_password_hash: hash },
    });
  } else {
    await remoteOrQueue({
      table: "app_settings",
      kind: "insert",
      row: { id: uid(), user_id: userId, weekly_budget: 0, private_password_hash: hash },
    });
  }
}

export async function clearNotePasswordHashes(): Promise<void> {
  const rows = await fetchAll("notes");
  for (const r of rows) {
    if (r.password_hash) {
      await remoteOrQueue({
        table: "notes",
        kind: "update",
        row: { id: r.id },
        changes: { password_hash: "" },
      });
    }
  }
}

// ---------- recipes ----------

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await fetchAll("recipes");
  return rows
    .sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")))
    .map((r) => r as unknown as Recipe);
}

export async function addRecipe(entry: {
  title: string;
  ingredients: string;
  instructions: string;
  servings: number;
}): Promise<string> {
  const id = uid();
  await remoteOrQueue({
    table: "recipes",
    kind: "insert",
    row: {
      id,
      title: entry.title,
      ingredients: entry.ingredients,
      instructions: entry.instructions,
      servings: Math.max(1, Math.round(entry.servings)),
    },
  });
  return id;
}

export async function deleteRecipe(id: string): Promise<void> {
  await remoteOrQueue({ table: "recipes", kind: "delete", row: { id } });
}

// ---------- meal library ----------

export async function listMealLibrary(): Promise<MealLibraryItem[]> {
  const rows = await fetchAll("meal_library");
  return rows
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
    .map((r) => r as unknown as MealLibraryItem);
}

export async function addMealLibraryItem(entry: {
  name: string;
  meal_type: string;
  default_cost?: number;
  emoji?: string;
  notes?: string;
  recipe_id?: string | null;
}): Promise<string> {
  const id = uid();
  await remoteOrQueue({
    table: "meal_library",
    kind: "insert",
    row: {
      id,
      name: entry.name,
      meal_type: entry.meal_type,
      default_cost: Math.max(0, Math.round(entry.default_cost ?? 0)),
      emoji: entry.emoji ?? "🍽️",
      notes: entry.notes ?? "",
      recipe_id: entry.recipe_id ?? null,
    },
  });
  return id;
}

export async function deleteMealLibraryItem(id: string): Promise<void> {
  await remoteOrQueue({ table: "meal_library", kind: "delete", row: { id } });
}

// ---------- pantry ----------

export async function listPantry(): Promise<PantryItem[]> {
  const rows = await fetchAll("pantry_items");
  return rows
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")))
    .map((r) => r as unknown as PantryItem);
}

export async function addPantryItem(entry: {
  name: string;
  quantity?: string;
  unit?: string;
  need_to_buy?: boolean;
}): Promise<void> {
  await remoteOrQueue({
    table: "pantry_items",
    kind: "insert",
    row: {
      id: uid(),
      name: entry.name,
      quantity: entry.quantity ?? "",
      unit: entry.unit ?? "",
      need_to_buy: entry.need_to_buy ?? false,
    },
  });
}

export async function setPantryNeedToBuy(id: string, need_to_buy: boolean): Promise<void> {
  await remoteOrQueue({ table: "pantry_items", kind: "update", row: { id }, changes: { need_to_buy } });
}

export async function deletePantryItem(id: string): Promise<void> {
  await remoteOrQueue({ table: "pantry_items", kind: "delete", row: { id } });
}

// ---------- shopping list ----------

export async function listShopping(): Promise<ShoppingItem[]> {
  const rows = await fetchAll("shopping_list");
  const boughtRank = (r: Row) => (r.bought ? 1 : 0);
  return rows
    .sort((a, b) => boughtRank(a) - boughtRank(b) || String(a.name ?? "").localeCompare(String(b.name ?? "")))
    .map((r) => r as unknown as ShoppingItem);
}

export async function addShoppingItem(entry: {
  name: string;
  quantity?: string;
  est_cost?: number;
}): Promise<void> {
  await remoteOrQueue({
    table: "shopping_list",
    kind: "insert",
    row: {
      id: uid(),
      name: entry.name,
      quantity: entry.quantity ?? "",
      est_cost: Math.max(0, Math.round(entry.est_cost ?? 0)),
      bought: false,
    },
  });
}

export async function setShoppingBought(id: string, bought: boolean): Promise<void> {
  await remoteOrQueue({ table: "shopping_list", kind: "update", row: { id }, changes: { bought } });
}

export async function recordShoppingPurchase(item: ShoppingItem): Promise<void> {
  if (item.bought) return;
  const budgetItems = await listBudgetItems();
  if (!budgetItems.some((budgetItem) => budgetItem.id === item.id)) {
    await remoteOrQueue({
      table: "budget_items",
      kind: "insert",
      row: {
        id: item.id,
        kind: "expense",
        amount: Math.max(0, Math.round(item.est_cost)),
        category: "Shopping",
        note: `${item.name}${item.quantity ? ` · ${item.quantity}` : ""}`,
        item_date: todayISO(),
      },
    });
  }
  await setShoppingBought(item.id, true);
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await remoteOrQueue({ table: "shopping_list", kind: "delete", row: { id } });
}

// ---------- budget ----------

export async function listBudgetItems(): Promise<BudgetItem[]> {
  const rows = await fetchAll("budget_items");
  return rows
    .sort((a, b) => String(b.item_date ?? "").localeCompare(String(a.item_date ?? "")))
    .map((r) => r as unknown as BudgetItem);
}

export async function addBudgetItem(entry: {
  id?: string;
  kind: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  item_date: string;
}): Promise<void> {
  await remoteOrQueue({
    table: "budget_items",
    kind: "insert",
    row: {
      id: entry.id ?? uid(),
      kind: entry.kind,
      amount: Math.max(0, Math.round(entry.amount)),
      category: entry.category,
      note: entry.note,
      item_date: entry.item_date,
    },
  });
}

export async function deleteBudgetItem(id: string): Promise<void> {
  await remoteOrQueue({ table: "budget_items", kind: "delete", row: { id } });
}
