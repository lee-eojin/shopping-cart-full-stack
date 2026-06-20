import { useState, useTransition } from "react";

export function useAsyncAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);

  function run(...args: A) {
    startTransition(async () => {
      setError(null);
      try {
        await action(...args);
      } catch (reason) {
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      }
    });
  }

  return { run, isPending, error };
}
