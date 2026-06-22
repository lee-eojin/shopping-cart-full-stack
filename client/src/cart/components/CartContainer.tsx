import styled from "@emotion/styled";
import { useOptimistic, useRef, useTransition } from "react";

import { submitOrder } from "../../order/orderApi.ts";
import type { OrderRequestItem } from "../../order/type.ts";
import { useQueryCache } from "../../shared/api/query/queryCacheContext.ts";
import { ErrorMessage } from "../../shared/components/feedback/ErrorMessage.tsx";
import { Spinner } from "../../shared/components/feedback/Spinner.tsx";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { useAsyncAction } from "../../shared/lib/useAsyncAction.ts";
import { applyCartAction, calcSummary, canOrder, clampQuantity } from "../cartModel.ts";
import { useCart } from "../hooks/useCart.ts";
import { useCartMutations } from "../hooks/useCartMutations.ts";
import { useSelection } from "../hooks/useSelection.ts";

import { CartList } from "./CartList.tsx";
import { FreeShippingNotice } from "./FreeShippingNotice.tsx";
import { OrderButton } from "./OrderButton.tsx";
import { OrderSummary } from "./OrderSummary.tsx";
import { SelectAll } from "./SelectAll.tsx";

interface CartContainerProps {
  onCheckout: () => void;
}

export function CartContainer({ onCheckout }: CartContainerProps) {
  const { data: items, isLoading, error, refetch } = useCart();
  const { updateQuantity, removeFromCart } = useCartMutations();
  const { isSelected, select, setAll } = useSelection();
  const [, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(items ?? [], applyCartAction);
  const cache = useQueryCache();
  const submitting = useRef(false);

  const checkout = useAsyncAction(async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const orderItems: OrderRequestItem[] = optimisticItems
        .filter((item) => isSelected(item.id))
        .map((item) => ({ productId: item.id, productQuantity: item.quantity }));
      const created = await submitOrder(orderItems);
      cache.setData(["order"], created);
      onCheckout(); // navigate("/order")
    } finally {
      submitting.current = false;
    }
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage onRetry={refetch} />;
  if (optimisticItems.length === 0) return <Empty>장바구니가 비어 있습니다</Empty>;

  const view = optimisticItems.map((item) => ({ ...item, selected: isSelected(item.id) }));
  const { orderAmount, shippingFee, total, remaining } = calcSummary(view);
  const allSelected = view.every((item) => item.selected);
  const mutationError = updateQuantity.error ?? removeFromCart.error;

  const handleQuantityChange = (id: number, quantity: number) => {
    const next = clampQuantity(quantity);
    startTransition(async () => {
      applyOptimistic({ type: "quantity", id, quantity: next });
      await updateQuantity.mutate({ id, quantity: next });
    });
  };

  const handleRemove = (id: number) => {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      await removeFromCart.mutate(id);
    });
  };

  return (
    <Stack gap={24}>
      {mutationError && <ErrorMessage message="요청을 처리하지 못했습니다. 다시 시도해 주세요." />}
      <SelectAll
        checked={allSelected}
        onSelectAll={(checked) => setAll(optimisticItems.map((item) => item.id), checked)}
      />
      <CartList
        items={view}
        onSelect={(id, selected) => select(id, selected)}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemove}
      />
      <FreeShippingNotice remaining={remaining} />
      <OrderSummary orderAmount={orderAmount} shippingFee={shippingFee} total={total} />
      {checkout.error && <ErrorMessage message="주문서를 만들지 못했습니다. 다시 시도해 주세요." />}
      <OrderButton
        disabled={!canOrder(orderAmount) || checkout.isPending}
        onCheckout={() => checkout.run()}
      />
    </Stack>
  );
}

const Empty = styled.p``;
