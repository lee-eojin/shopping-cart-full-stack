import styled from "@emotion/styled";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { Spinner } from "../../shared/components/feedback/Spinner.tsx";
import { ErrorMessage } from "../../shared/components/feedback/ErrorMessage.tsx";
import { useCart } from "../hooks/useCart.ts";
import { useSelection } from "../hooks/useSelection.ts";
import { calcSummary, canOrder } from "../cartModel.ts";
import { formatPrice } from "../../shared/lib/format.ts";

interface OrderConfirmContainerProps {
  onBackToCart: () => void;
}

export function OrderConfirmContainer({ onBackToCart }: OrderConfirmContainerProps) {
  const { data: items, isLoading, error, refetch } = useCart();
  const { isSelected } = useSelection();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage onRetry={refetch} />;

  const view = (items ?? []).map((item) => ({ ...item, selected: isSelected(item.id) }));

  if (view.length === 0) {
    return (
      <Stack gap={12}>
        <p>주문할 상품이 없습니다</p>
        <button type="button" onClick={onBackToCart}>
          장바구니로 가기
        </button>
      </Stack>
    );
  }

  const { orderAmount, total } = calcSummary(view);

  return (
    <Stack gap={24}>
      <Stack gap={4}>
        <span>총 결제 금액</span>
        <Amount>{formatPrice(total)}</Amount>
      </Stack>
      <PayButton type="button" disabled={!canOrder(orderAmount)}>
        결제하기
      </PayButton>
    </Stack>
  );
}

const Amount = styled.p``;
const PayButton = styled.button`
  width: 100%;
  padding: 16px;
`;
