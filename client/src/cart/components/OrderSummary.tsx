import { Row } from "../../shared/components/layout/Row.tsx";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { formatPrice } from "../../shared/lib/format.ts";

interface OrderSummaryProps {
  orderAmount: number;
  couponDiscountAmount?: number;
  shippingFee: number;
  total: number;
}

export function OrderSummary({ orderAmount, couponDiscountAmount, shippingFee, total }: OrderSummaryProps) {
  return (
    <Stack gap={10}>
      <Row left="주문 금액" right={formatPrice(orderAmount)} />
      {couponDiscountAmount !== undefined && (
        <Row left="쿠폰 할인" right={`- ${formatPrice(couponDiscountAmount)}`} />
      )}
      <Row left="배송비" right={formatPrice(shippingFee)} />
      <Row left="총 결제 금액" right={formatPrice(total)} />
    </Stack>
  );
}
