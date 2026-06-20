import { useQuery } from "../../shared/api/query/useQuery";
import { previewCoupons } from "../orderApi";
import type { CouponPreview } from "../type";

export function useCouponPreview(couponIds: number[]) {
  return useQuery<CouponPreview>({
    queryKey: ["order", "preview", couponIds],
    queryFn: () => previewCoupons(couponIds),
  });
}
