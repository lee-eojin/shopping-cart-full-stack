export type QueryKey = readonly unknown[];

export type QueryStatus = "pending" | "success" | "error";

export interface QueryState<T> {
  status: QueryStatus;
  data?: T;
  error?: Error;
}

type Listener = () => void;

interface QueryEntry {
  state: QueryState<unknown>;
  queryFn: () => Promise<unknown>;
  listeners: Set<Listener>;
  fetchId: number;
}

function hashKey(key: QueryKey): string {
  return JSON.stringify(key);
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

export class QueryCache {
  private entries = new Map<string, QueryEntry>();

  getState<T>(key: QueryKey): QueryState<T> | undefined {
    return this.entries.get(hashKey(key))?.state as QueryState<T> | undefined;
  }

  subscribe(key: QueryKey, listener: Listener): () => void {
    const entry = this.ensureEntry(key);
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
  }

  async fetch<T>(key: QueryKey, queryFn: () => Promise<T>): Promise<void> {
    const entry = this.ensureEntry(key);
    entry.queryFn = queryFn as () => Promise<unknown>;
    const fetchId = ++entry.fetchId;
    this.transition(entry, { status: "pending", data: entry.state.data });

    try {
      const data = await queryFn();
      if (entry.fetchId !== fetchId) return;
      this.transition(entry, { status: "success", data });
    } catch (reason) {
      if (entry.fetchId !== fetchId) return;
      this.transition(entry, { status: "error", error: toError(reason) });
    }
  }

  async invalidate(key: QueryKey): Promise<void> {
    const entry = this.entries.get(hashKey(key));
    if (!entry) return;
    await this.fetch(key, entry.queryFn);
  }

  private ensureEntry(key: QueryKey): QueryEntry {
    const hash = hashKey(key);
    let entry = this.entries.get(hash);
    if (!entry) {
      entry = {
        state: { status: "pending" },
        queryFn: () => Promise.resolve(),
        listeners: new Set(),
        fetchId: 0,
      };
      this.entries.set(hash, entry);
    }
    return entry;
  }

  private transition(entry: QueryEntry, state: QueryState<unknown>): void {
    entry.state = state;
    entry.listeners.forEach((listener) => listener());
  }
}
