import { useQuery } from "../../shared/api/query/useQuery";
import { getCoupons } from "../couponApi.ts";
import type { CouponsResponse } from "../type";

export function useCoupons() {
  return useQuery<CouponsResponse>({ queryKey: ["coupons"], queryFn: getCoupons });
}

