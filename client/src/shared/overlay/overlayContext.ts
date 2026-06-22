import { createContext, use, type ReactNode } from "react";

export type OverlayController<T> = (props: { close: (value: T | null) => void }) => ReactNode;

export interface OverlayContextValue {
  openAsync: <T>(controller: OverlayController<T>) => Promise<T | null>;
  //RouteOberlay Cleanup
  closeAll: () => void;
}

export const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlay(): OverlayContextValue {
  const overlay = use(OverlayContext);
  if (!overlay) throw new Error("useOverlay는 OverlayProvider 안에서만 쓸 수 있습니다.");

  return overlay;
}
