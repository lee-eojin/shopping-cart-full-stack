import { useEffect, useState } from "react";

// delay만큼 확실히 늦춰서 서버 요청 횟수를 줄인다
export function useDebouncedValue<T>(value: T, delay: number):T {
  const [debounced, setDebounced] = useState(value);

  useEffect(function syncAfterDelay() {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}