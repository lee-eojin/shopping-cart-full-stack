import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useOverlay } from "../shared/overlay/overlayContext.ts";

// 경로가 바뀌면 열린 모달을 모두 닫는다.
function RouteOverlayCleanup() {
  const { pathname } = useLocation();
  const { closeAll } = useOverlay();
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);
  return null;
}

export function RootLayout() {
  return (
    <>
      <RouteOverlayCleanup />
      <Outlet />
    </>
  );
}
