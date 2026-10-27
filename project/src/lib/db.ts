import Dexie, { type Table } from "dexie";

export type Row = Record<string, unknown> & { id: string };

export interface CachedRecord {
  table: string;
  id: string;
  data: Row;
}

export interface SyncItem {
  id?: number;
  ts: number;
  table: string;
  kind: "insert" | "update" | "delete";
  row: Row;
  changes?: Record<string, unknown>;
}

export const DATA_TABLES = [
  "profiles",
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
  "app_settings",
  "recipes",
  "meal_library",
  "pantry_items",
  "shopping_list",
  "budget_items",
] as const;

export type DataTable = (typeof DATA_TABLES)[number];

class LifeHubDB extends Dexie {
  records!: Table<CachedRecord, [string, string]>;
  syncQueue!: Table<SyncItem, number>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("lifehub-local");
    this.version(1).stores({
      records: "[table+id], table, id",
      syncQueue: "++id, table, ts",
      meta: "key",
    });
  }
}

export const db = new LifeHubDB();

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Row =>
      typeof row === "object" &&
      row !== null &&
      !Array.isArray(row) &&
      typeof (row as { id?: unknown }).id === "string"
  );
}

function asQueue(value: unknown): Omit<SyncItem, "id">[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Omit<SyncItem, "id"> =>
      typeof item === "object" &&
      item !== null &&
      "table" in item &&
      typeof (item as SyncItem).table === "string" &&
      "kind" in item &&
      ((item as SyncItem).kind === "insert" ||
        (item as SyncItem).kind === "update" ||
        (item as SyncItem).kind === "delete") &&
      "row" in item &&
      typeof (item as SyncItem).row === "object" &&
      (item as SyncItem).row !== null
  );
}

let migratePromise: Promise<void> | null = null;

export async function ensureLocalDb(): Promise<void> {
  if (!migratePromise) migratePromise = migrateFromLocalStorage();
  await migratePromise;
}

async function migrateFromLocalStorage(): Promise<void> {
  try {
    const already = await db.meta.get("migrated-from-localstorage");
    if (already?.value === true) return;

    for (const table of DATA_TABLES) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(`lifehub:cache:${table}`);
      } catch {
        raw = null;
      }
      if (!raw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const rows = asRows(parsed);
      if (rows.length === 0) continue;
      await db.records.bulkPut(rows.map((row) => ({ table, id: row.id, data: row })));
    }

    let queueRaw: string | null = null;
    try {
      queueRaw = localStorage.getItem("lifehub:sync-queue");
    } catch {
      queueRaw = null;
    }
    if (queueRaw) {
      try {
        const items = asQueue(JSON.parse(queueRaw));
        if (items.length > 0) await db.syncQueue.bulkAdd(items);
      } catch {
        // keep going; local cache still migrated
      }
    }

    await db.meta.put({ key: "migrated-from-localstorage", value: true });
  } catch {
    // IndexedDB can be blocked; callers still operate on empty local data
  }
}

export async function readLocalTable(table: string): Promise<Row[]> {
  await ensureLocalDb();
  const records = await db.records.where("table").equals(table).toArray();
  return records.map((record) => record.data);
}

export async function writeLocalTable(table: string, rows: Row[]): Promise<void> {
  await ensureLocalDb();
  await db.transaction("rw", db.records, async () => {
    await db.records.where("table").equals(table).delete();
    if (rows.length > 0) {
      await db.records.bulkPut(rows.map((row) => ({ table, id: String(row.id), data: { ...row, id: String(row.id) } })));
    }
  });
}

export function applySyncItem(rows: Row[], item: Omit<SyncItem, "id" | "ts">): Row[] {
  const next = [...rows];
  const id = String(item.row.id);
  if (item.kind === "insert") {
    const idx = next.findIndex((row) => String(row.id) === id);
    if (idx >= 0) next[idx] = { ...item.row, id };
    else next.push({ ...item.row, id });
  } else if (item.kind === "update") {
    const idx = next.findIndex((row) => String(row.id) === id);
    if (idx >= 0) next[idx] = { ...next[idx], ...(item.changes ?? {}), id };
    else next.push({ ...item.row, ...(item.changes ?? {}), id });
  } else {
    const idx = next.findIndex((row) => String(row.id) === id);
    if (idx >= 0) next.splice(idx, 1);
  }
  return next;
}

export async function applyLocalItem(item: Omit<SyncItem, "id" | "ts">): Promise<void> {
  const current = await readLocalTable(item.table);
  await writeLocalTable(item.table, applySyncItem(current, item));
}

export async function mergeLocalRows(table: string, rows: Row[]): Promise<void> {
  await ensureLocalDb();
  const current = await readLocalTable(table);
  const byId = new Map(current.map((row) => [String(row.id), row]));
  for (const row of rows) byId.set(String(row.id), { ...row, id: String(row.id) });
  await writeLocalTable(table, [...byId.values()]);
}

export async function readQueue(): Promise<SyncItem[]> {
  await ensureLocalDb();
  return db.syncQueue.orderBy("id").toArray();
}

export async function enqueueItem(item: Omit<SyncItem, "id">): Promise<void> {
  await ensureLocalDb();
  await db.syncQueue.add(item);
}

export async function replaceQueue(items: SyncItem[]): Promise<void> {
  await ensureLocalDb();
  await db.transaction("rw", db.syncQueue, async () => {
    await db.syncQueue.clear();
    if (items.length > 0) {
      await db.syncQueue.bulkAdd(items.map(({ id: _id, ...rest }) => rest));
    }
  });
}
