import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryCacheProvider } from "./shared/api/query/QueryCacheProvider.tsx";
import { CartPage } from "./page/CartPage.tsx";
import { OrderConfirmPage } from "./page/OrderConfirmPage.tsx";

const router = createBrowserRouter([
  { path: "/", element: <CartPage /> },
  { path: "/order", element: <OrderConfirmPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryCacheProvider>
      <RouterProvider router={router} />
    </QueryCacheProvider>
  </StrictMode>,
);
