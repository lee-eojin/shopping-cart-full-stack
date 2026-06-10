import { useState, type ReactNode } from "react";
import { QueryCache } from "./queryCache.ts";
import { QueryCacheContext } from "./queryCacheContext.ts";

export function QueryCacheProvider({ cache, children }: { cache?: QueryCache; children: ReactNode }) {
  const [fallback] = useState(() => new QueryCache());
  const value = cache ?? fallback;

  return <QueryCacheContext value={value}>{children}</QueryCacheContext>;
}
