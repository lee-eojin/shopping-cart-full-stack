import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { OverlayContext, type OverlayController } from "./overlayContext";

let sequence = 0;
const nextOverlayId = () => `overlay-${(sequence += 1)}`;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Map<string, ReactNode>>(new Map());

  const pendingCancellations = useRef(new Map<string, () => void>());

  const remove = useCallback((id: string) => {
    pendingCancellations.current.delete(id);
    setOverlays((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }, []);

  const openAsync = useCallback(<T,>(controller: OverlayController<T>) => {
    const id = nextOverlayId();
    // tsconfig lib version: ES 2024, Because of Promise.withResolvers
    const { promise, resolve } = Promise.withResolvers<T | null>();

    let settled = false;
    const close = (value: T | null) => {
      if (settled) return;
      settled = true;
      remove(id);
      resolve(value);
    };

    pendingCancellations.current.set(id, () => {
      if (settled) return;
      settled = true;
      resolve(null);
    });

    const node = controller({ close });
    setOverlays((current) => new Map(current).set(id, node));
    return promise;
  }, [remove]);

  const closeAll = useCallback(() => {
    const cancelAll = [...pendingCancellations.current.values()];
    pendingCancellations.current.clear();
    setOverlays(new Map());
    cancelAll.forEach((cancel) => cancel());
  }, []);

  // clean-up
  useEffect(() => closeAll, [closeAll]);

  const value = useMemo(() => ({ openAsync, closeAll }), [openAsync, closeAll]);

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
