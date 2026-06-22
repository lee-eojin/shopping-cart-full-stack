import { useState } from "react";

interface MutationOptions<Vars, Data> {
  mutationFn: (vars: Vars) => Promise<Data>;
  onSettled?: () => void | Promise<void>;
}

interface UseMutationResult<Vars, Data> {
  mutate: (vars: Vars) => Promise<void>; // 실패는 error 상태로만 남음
  mutateAsync: (vars: Vars) => Promise<Data>;
  isPending: boolean;
  error?: Error;
}

export function useMutation<Vars = void, Data = unknown>({
  mutationFn,
  onSettled,
}: MutationOptions<Vars, Data>): UseMutationResult<Vars, Data> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const mutateAsync = async (vars: Vars): Promise<Data> => {
    setIsPending(true);
    setError(undefined);
    try {
      return await mutationFn(vars);
    } catch (reason) {
      const normalized = reason instanceof Error ? reason : new Error(String(reason));
      setError(normalized);
      throw normalized;
    } finally {
      setIsPending(false);
      await onSettled?.();
    }
  };

  const mutate = async (vars: Vars): Promise<void> => {
    try {
      await mutateAsync(vars);
    } catch {
      // fire-and-forget
    }
  };

  return { mutate, mutateAsync, isPending, error };
}
