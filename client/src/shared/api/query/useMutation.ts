import { useState } from "react";

interface MutationOptions<Vars, Data> {
  mutationFn: (vars: Vars) => Promise<Data>;
  onSettled?: () => void | Promise<void>;
}

interface UseMutationResult<Vars> {
  mutate: (vars: Vars) => Promise<void>;
  isLoading: boolean;
  error?: Error;
}

export function useMutation<Vars = void, Data = unknown>({
  mutationFn,
  onSettled,
}: MutationOptions<Vars, Data>): UseMutationResult<Vars> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const mutate = async (vars: Vars) => {
    setIsLoading(true);
    setError(undefined);
    try {
      await mutationFn(vars);
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error(String(reason)));
    } finally {
      setIsLoading(false);
      await onSettled?.();
    }
  };

  return { mutate, isLoading, error };
}
