import type { Row as BackupRow } from "./backupTypes";
import { listCachedTable, restoreRowsLocally } from "./data";
import type { Row } from "./db";

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
] as const;

const EXPORT_VERSION = 1;

export interface BackupFile {
  app: "Life Hub";
  version: number;
  exported_at: string;
  data: Record<string, unknown[]>;
}

export interface BackupProgress {
  backedUp: number;
  remaining: number;
  total: number;
}

export async function createBackup(onProgress?: (progress: BackupProgress) => void): Promise<BackupFile> {
  const total = await countRows();
  let backedUp = 0;
  onProgress?.({ backedUp, remaining: total, total });
  const data: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const tableRows = await listCachedTable(table);
    data[table] = tableRows;
    backedUp += tableRows.length;
    onProgress?.({ backedUp, remaining: Math.max(0, total - backedUp), total });
  }
  return {
    app: "Life Hub",
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    data,
  };
}

function downloadBackup(file: BackupFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = file.exported_at.slice(0, 10);
  a.download = `life-hub-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function backupToFile(onProgress?: (progress: BackupProgress) => void): Promise<BackupProgress> {
  const file = await createBackup(onProgress);
  downloadBackup(file);
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
    const clean = rows.filter(
      (r): r is Row => typeof r === "object" && r !== null && typeof (r as BackupRow).id === "string"
    );
    if (clean.length === 0) continue;
    await restoreRowsLocally(table, clean);
    restored += clean.length;
  }
  return { restored, skipped };
}

export async function countRows(): Promise<number> {
  let total = 0;
  for (const table of BACKUP_TABLES) {
    total += (await listCachedTable(table)).length;
  }
  return total;
}
