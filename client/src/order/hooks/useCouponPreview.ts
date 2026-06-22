import { useQuery } from "../../shared/api/query/useQuery";
import { previewCoupons } from "../orderApi";
import type { CouponPreview, UpdateCouponsRequest } from "../type";

export function useCouponPreview(couponIds: UpdateCouponsRequest["couponIds"]) {
  return useQuery<CouponPreview>({
    queryKey: ["order", "preview", couponIds],
    queryFn: () => previewCoupons({ couponIds }),
  });
}
