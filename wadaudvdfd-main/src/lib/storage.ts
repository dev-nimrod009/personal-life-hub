export function getStoredValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable or full; callers retain their in-memory state.
  }
}

export function removeStoredValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable; callers still update their in-memory state.
  }
}

export function clearLocalData(): void {
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
}

