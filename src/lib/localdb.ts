// Device-first store for cached tables and the sync queue.
// Data lives in IndexedDB; an in-memory mirror keeps reads synchronous.
// Falls back to localStorage when IndexedDB is unavailable.
import { getStoredValue, removeStoredValue, setStoredValue } from "./storage";

const DB_NAME = "lifehub";
const STORE = "kv";
const memory = new Map<string, string>();
let db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function isManagedKey(key: string): boolean {
  return key.startsWith("lifehub:cache:") || key === "lifehub:sync-queue";
}

export async function hydrateLocalDb(): Promise<void> {
  db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db!.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (typeof cursor.value === "string") memory.set(String(cursor.key), cursor.value);
          cursor.continue();
        } else resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  // One-time migration of data saved by older versions in localStorage.
  try {
    const legacy: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isManagedKey(key)) legacy.push(key);
    }
    for (const key of legacy) {
      const value = getStoredValue(key);
      if (value != null && !memory.has(key)) localSet(key, value);
      removeStoredValue(key);
    }
  } catch {
    // localStorage unavailable
  }
}

function persist(key: string, value: string | null): void {
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    if (value == null) tx.objectStore(STORE).delete(key);
    else tx.objectStore(STORE).put(value, key);
  } catch {
    // ignore - memory copy stays consistent for this session
  }
}

export function localGet(key: string): string | null {
  if (!db) return getStoredValue(key);
  return memory.get(key) ?? null;
}

export function localSet(key: string, value: string): void {
  if (!db) {
    setStoredValue(key, value);
    return;
  }
  memory.set(key, value);
  persist(key, value);
}

export function localRemove(key: string): void {
  if (!db) {
    removeStoredValue(key);
    return;
  }
  memory.delete(key);
  persist(key, null);
}

export function localKeys(): string[] {
  if (db) return Array.from(memory.keys());
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

export function localUsesIndexedDb(): boolean {
  return db !== null;
}

export async function clearLocalDb(): Promise<void> {
  memory.clear();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db!.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
