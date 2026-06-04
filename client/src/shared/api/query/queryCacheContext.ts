import { createContext, useContext } from "react";
import { QueryCache } from "./queryCache.ts";

export const QueryCacheContext = createContext<QueryCache | null>(null);

export function useQueryCache(): QueryCache {
  const cache = useContext(QueryCacheContext);
  if (!cache) {
    throw new Error("useQueryCache는 QueryCacheProvider 안에서만 쓸 수 있습니다.");
  }
  return cache;
}
