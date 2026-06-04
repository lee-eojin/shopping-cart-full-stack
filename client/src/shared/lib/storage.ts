export function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFromStorage<T>(key: string): T | null {
  const raw = localStorage.getItem(key);

  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
