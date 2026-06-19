import { apiRequest } from "../shared/api/client";
import type { CouponsResponse } from "./type";

export function getCoupons(): Promise<CouponsResponse> {
  return apiRequest<CouponsResponse>("/coupons");
}
