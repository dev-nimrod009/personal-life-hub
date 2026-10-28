import { fetchAllRows, importRows } from "./data";
import { getStoredValue, setStoredValue } from "./storage";
import type { Row } from "./backupTypes";

const BACKUP_TABLES = [
  "journal_entries",
  "diary_entries",
  "notes",
  "day_plans",
  "reminders",
  "habits",
  "habit_logs",
  "meals",
  "moods",
  "water_intake",
  "gratitude_entries",
  "goals",
  "goal_steps",
  "saved_quotes",
  "inbox_items",
  "recipes",
  "meal_library",
  "pantry_items",
  "shopping_list",
  "budget_items",
] as const;

// Modules that live only on this device (no cloud table).
const DEVICE_KEYS = [
  "lifehub:skills",
  "lifehub:curriculum",
  "lifehub:experiments",
  "lifehub:spaced_ideas",
  "lifehub:cycle_logs",
  "lifehub:modules",
  "lifehub:current-focus",
] as const;

const EXPORT_VERSION = 2;

export interface BackupFile {
  app: "Life Hub";
  version: number;
  exported_at: string;
  data: Record<string, unknown[]>;
  device?: Record<string, string>;
}

export interface BackupProgress {
  backedUp: number;
  remaining: number;
  total: number;
}

async function readTables(): Promise<Record<string, Row[]>> {
  const data: Record<string, Row[]> = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await fetchAllRows(table);
  }
  return data;
}

export async function createBackup(onProgress?: (progress: BackupProgress) => void): Promise<BackupFile> {
  const data = await readTables();
  const total = Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
  onProgress?.({ backedUp: total, remaining: 0, total });
  const device: Record<string, string> = {};
  for (const key of DEVICE_KEYS) {
    const value = getStoredValue(key);
    if (value != null) device[key] = value;
  }
  return { app: "Life Hub", version: EXPORT_VERSION, exported_at: new Date().toISOString(), data, device };
}

function download(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function backupToFile(onProgress?: (progress: BackupProgress) => void): Promise<BackupProgress> {
  const file = await createBackup(onProgress);
  download(JSON.stringify(file, null, 2), "application/json", `life-hub-backup-${file.exported_at.slice(0, 10)}.json`);
  const total = Object.values(file.data).reduce((sum, rows) => sum + rows.length, 0);
  return { backedUp: total, remaining: 0, total };
}

export async function restoreFromText(text: string): Promise<{ restored: number; skipped: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not a valid backup file.");
  }
  const backup = parsed as BackupFile;
  if (backup?.app !== "Life Hub" || typeof backup?.data !== "object" || backup.data === null) {
    throw new Error("That file is not a Life Hub backup file.");
  }

  let restored = 0;
  let skipped = 0;
  for (const table of BACKUP_TABLES) {
    const rows = backup.data[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const clean = rows.filter((r): r is Row => typeof r === "object" && r !== null && typeof (r as Row).id === "string");
    await fetchAllRows(table).catch(() => []);
    const result = await importRows(table, clean);
    restored += result.restored;
    skipped += result.skipped + (rows.length - clean.length);
  }
  if (backup.device && typeof backup.device === "object") {
    for (const key of DEVICE_KEYS) {
      const value = backup.device[key];
      if (typeof value === "string" && !getStoredValue(key)) {
        setStoredValue(key, value);
        restored++;
      }
    }
  }
  return { restored, skipped };
}

export async function countRows(): Promise<number> {
  const data = await readTables();
  return Object.values(data).reduce((sum, rows) => sum + rows.length, 0);
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const byField = (field: string) => (a: Row, b: Row) => str(b[field]).localeCompare(str(a[field]));

export async function exportMarkdownFile(): Promise<number> {
  const d = await readTables();
  const out: string[] = [`# Life Hub Export`, ``, `Exported on ${new Date().toLocaleString()}`, ``];
  let count = 0;
  const section = (title: string, rows: Row[], render: (r: Row) => string) => {
    if (rows.length === 0) return;
    out.push(`## ${title}`, "");
    for (const r of rows) {
      out.push(render(r), "");
      count++;
    }
  };
  section("Journal", [...d.journal_entries].sort(byField("created_at")), (r) =>
    `### ${str(r.title) || "Untitled"} (${str(r.created_at).slice(0, 10)})\n\n${str(r.content)}`
  );
  section("Diary", [...d.diary_entries].sort(byField("entry_date")), (r) => `### ${str(r.entry_date)}\n\n${str(r.content)}`);
  section("Notes", d.notes.filter((r) => (r.category ?? "personal") !== "private" && !r.password_hash), (r) => `### ${str(r.title) || "Untitled"}\n\n${str(r.content)}`);
  section("Brain Dump", [...d.inbox_items].sort(byField("created_at")), (r) => `- ${str(r.content)}`);
  section("Gratitude", [...d.gratitude_entries].sort(byField("entry_date")), (r) => `- ${str(r.entry_date)}: ${str(r.content)}`);
  section("Quote Vault", d.saved_quotes, (r) => `> ${str(r.text)}${r.author ? `\n> — ${str(r.author)}` : ""}`);
  section("Goals", d.goals, (r) => `- ${str(r.title)} (${str(r.current)}/${str(r.target)})${r.description ? ` — ${str(r.description)}` : ""}`);
  section("Habits", d.habits, (r) => `- ${str(r.name).replace(" ||| ", " — ")}`);
  section("Mood", [...d.moods].sort(byField("mood_date")), (r) => `- ${str(r.mood_date)}: ${str(r.score)}/5${r.note ? ` — ${str(r.note)}` : ""}`);
  section("Budget", [...d.budget_items].sort(byField("item_date")), (r) =>
    `- ${str(r.item_date)} ${r.kind === "income" ? "+" : "-"}KES ${str(r.amount)} ${str(r.category)}${r.note ? ` — ${str(r.note)}` : ""}`
  );
  download(out.join("\n"), "text/markdown;charset=utf-8", `life-hub-export-${new Date().toISOString().slice(0, 10)}.md`);
  return count;
}

export async function exportBudgetCsv(): Promise<number> {
  const rows = [...(await fetchAllRows("budget_items").catch(() => []))].sort(byField("item_date"));
  const esc = (v: unknown) => `"${str(v).replace(/"/g, '""')}"`;
  const lines = ["date,type,category,amount,note", ...rows.map((r) => [r.item_date, r.kind, r.category, r.amount, r.note].map(esc).join(","))];
  download(lines.join("\n"), "text/csv;charset=utf-8", `life-hub-budget-${new Date().toISOString().slice(0, 10)}.csv`);
  return rows.length;
}
