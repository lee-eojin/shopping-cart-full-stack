import { useQuery } from "../../shared/api/query/useQuery";
import { getOrder } from "../orderApi";
import type { Order } from "../type";

export function useOrder() {
  return useQuery<Order>({ queryKey: ["order"], queryFn: getOrder });
}
