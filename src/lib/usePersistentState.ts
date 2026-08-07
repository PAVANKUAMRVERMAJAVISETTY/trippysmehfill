import { useEffect, useState } from 'react';

/**
 * Reads JSON out of localStorage, falling back to `fallback` when the key is
 * absent or holds corrupt data (a half-written value must not crash boot).
 */
export function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled -- the app still works without a cache.
  }
}

/** `useState` that hydrates from localStorage and writes back on every change. */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStoredJson(key, fallback));

  useEffect(() => {
    writeStoredJson(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
