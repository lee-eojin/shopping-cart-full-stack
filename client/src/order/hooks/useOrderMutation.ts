import { useMutation } from "../../shared/api/query/useMutation";
import { updateCoupons, updateDestination } from "../orderApi";

export function useOrderMutations() {
  const changeDestination = useMutation({ mutationFn: updateDestination });
  const applyCoupons = useMutation({ mutationFn: updateCoupons });

  return { changeDestination, applyCoupons };
}
