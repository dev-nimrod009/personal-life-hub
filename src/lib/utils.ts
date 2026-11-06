import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function todayISO(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDay(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3 && dateStr.length === 10) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function getInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "U";
  const trimmed = nameOrEmail.trim();
  if (trimmed.includes("@")) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function localDateKey(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Consecutive days with any habit done, counting back from today (or yesterday if today isn't logged yet).
export function consecutiveDayStreak(doneDates: Set<string>): number {
  if (doneDates.size === 0) return 0;
  const d = new Date();
  const todayKey = localDateKey(d);
  const doneToday = doneDates.has(todayKey);
  if (!doneToday) {
    d.setDate(d.getDate() - 1);
  }
  let count = 0;
  while (doneDates.has(localDateKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
    if (count >= 365) break;
  }
  return count;
}

export function isWholeNumberInRange(value: string, min: number, max: number): boolean {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
}

export function isNonNegativeAmount(value: string): boolean {
  if (value.trim() === "") return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function dateKeyOf(timestamp: string): string {
  return localDateKey(new Date(timestamp));
}

export function isValidAvatarLink(value: string): boolean {
  const v = value.trim();
  if (!v.startsWith("http")) return true;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}
