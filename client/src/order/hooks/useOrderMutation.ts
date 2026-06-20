import { useQueryCache } from "../../shared/api/query/queryCacheContext";
import { useMutation } from "../../shared/api/query/useMutation";
import { updateDestination } from "../orderApi";

export function useOrderMutations() {
  const cache = useQueryCache();

  function invalidateOrder() {
    return cache.invalidate(["order"]);
  }

  const changeDestination = useMutation({ mutationFn: updateDestination, onSettled: invalidateOrder });

  return { changeDestination };
}
