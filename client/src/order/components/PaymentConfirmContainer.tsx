import { ErrorMessage } from "../../shared/components/feedback/ErrorMessage.tsx";
import { Spinner } from "../../shared/components/feedback/Spinner.tsx";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { formatPrice } from "../../shared/lib/format.ts";
import { useOrder } from "../hooks/useOrder.ts";

interface PaymentConfirmContainerProps {
  onBackToCart: () => void; // navigate("/")
}

export function PaymentConfirmContainer({ onBackToCart }: PaymentConfirmContainerProps) {
  const { data: order, isLoading, error, refetch } = useOrder();

  if (isLoading) return <Spinner />;
  if (error || !order) return <ErrorMessage onRetry={refetch} />;

  const itemKinds = order.items.length;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.productQuantity, 0);

  return (
    <Stack gap={24}>
      <p>총 {itemKinds}종류의 상품 {totalQuantity}개를 주문했습니다. 최종 결제 금액을 확인해 주세요.</p>
      <strong>총 결제 금액 {formatPrice(order.totalPaymentAmount)}</strong>
      <button type="button" onClick={onBackToCart}>장바구니로 돌아가기</button>
    </Stack>
  );
}
