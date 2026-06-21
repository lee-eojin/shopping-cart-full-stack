import { useEffect, useSyncExternalStore } from "react";

import type { QueryKey, QueryState } from "./queryCache.ts";
import { useQueryCache } from "./queryCacheContext.ts";

interface UseQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
}

interface UseQueryResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  refetch: () => void;
}

const EMPTY: QueryState<unknown> = { status: "pending" };

export function useQuery<T>({ queryKey, queryFn }: UseQueryOptions<T>): UseQueryResult<T> {
  const cache = useQueryCache();
  const hash = JSON.stringify(queryKey);

  const state = useSyncExternalStore(
    function subscribe(listener) {
      return cache.subscribe(queryKey, listener);
    },
    function getSnapshot() {
      return cache.getState<T>(queryKey) ?? (EMPTY as QueryState<T>);
    },
  );

  useEffect(function fetchOnMount() {
    cache.fetch(queryKey, queryFn);
    // queryKey는 hash로 비교한다 (배열 참조가 매번 바뀌므로).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, hash]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.status === "pending" && state.data === undefined,
    refetch: () => cache.fetch(queryKey, queryFn),
  };
}
