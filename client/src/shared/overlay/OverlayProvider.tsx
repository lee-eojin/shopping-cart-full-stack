import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { OverlayContext, type OverlayController } from "./overlayContext";

let sequence = 0;
const nextOverlayId = () => `overlay-${(sequence += 1)}`;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Map<string, ReactNode>>(new Map());

  const remove = useCallback((id: string) => {
    setOverlays((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const openAsync = useCallback(<T,>(controller: OverlayController<T>) => {
    const id = nextOverlayId();
    // tsconfig lib version: ES 2024, Because of Promise.withResolvers
    const { promise, resolve } = Promise.withResolvers<T>();

    const close= (value: T) => {
      remove(id);
      resolve(value);
    };

    setOverlays((current) => new Map(current).set(id, controller({ close })));
    return promise;
  }, [remove]);

  const value = useMemo(() => ({ openAsync }), [openAsync]);

  return (
    <OverlayContext value={value}>
      {children}
      {overlays.size > 0 && createPortal(
        [...overlays].map(([id, node]) => <Fragment key={id}>{node}</Fragment>),
        document.body,
      )}
    </OverlayContext>
  );
}