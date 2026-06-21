import { useEffect, useState } from "react";

import { loadFromStorage, saveToStorage } from "../../shared/lib/storage.ts";
import type { SelectionState } from "../types.ts";

const SELECTION_KEY = "cart-selection";

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>(
    () => loadFromStorage<SelectionState>(SELECTION_KEY) ?? {},
  );

  useEffect(function persistSelection() {
    saveToStorage(SELECTION_KEY, selection);
  }, [selection]);

  const isSelected = (id: number) => selection[id] ?? true;

  const select = (id: number, value: boolean) =>
    setSelection((prev) => ({ ...prev, [id]: value }));

  const setAll = (ids: number[], value: boolean) =>
    setSelection(Object.fromEntries(ids.map((id) => [id, value])));

  return { isSelected, select, setAll };
}
