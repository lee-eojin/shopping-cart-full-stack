import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryCacheProvider } from "./shared/api/query/QueryCacheProvider.tsx";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryCacheProvider>
      <App />
    </QueryCacheProvider>
  </StrictMode>,
);
