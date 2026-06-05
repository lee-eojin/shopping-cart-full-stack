import { useOptimistic, useTransition } from "react";
import styled from "@emotion/styled";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { Spinner } from "../../shared/components/feedback/Spinner.tsx";
import { ErrorMessage } from "../../shared/components/feedback/ErrorMessage.tsx";
import { SelectAll } from "./SelectAll.tsx";
import { CartList } from "./CartList.tsx";
import { FreeShippingNotice } from "./FreeShippingNotice.tsx";
import { OrderSummary } from "./OrderSummary.tsx";
import { OrderButton } from "./OrderButton.tsx";
import { useCart } from "../hooks/useCart.ts";
import { useCartMutations } from "../hooks/useCartMutations.ts";
import { useSelection } from "../hooks/useSelection.ts";
import {
  applyCartAction,
  calcOrderAmount,
  calcShippingFee,
  calcTotal,
  clampQuantity,
  FREE_SHIPPING_THRESHOLD,
} from "../cartModel.ts";

export function CartContainer() {
  const { data: items, isLoading, error, refetch } = useCart();
  const { updateQuantity, removeFromCart } = useCartMutations();
  const { isSelected, select, setAll } = useSelection();
  const [, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(items ?? [], applyCartAction);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage onRetry={refetch} />;
  if (optimisticItems.length === 0) return <Empty>장바구니가 비어 있습니다</Empty>;

  const view = optimisticItems.map((item) => ({ ...item, selected: isSelected(item.id) }));
  const orderAmount = calcOrderAmount(view);
  const shippingFee = calcShippingFee(orderAmount);
  const total = calcTotal(orderAmount, shippingFee);
  const remaining = FREE_SHIPPING_THRESHOLD - orderAmount;
  const allSelected = view.every((item) => item.selected);

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
      <SelectAll
        checked={allSelected}
        onSelectAll={(checked) =>
          setAll(
            optimisticItems.map((item) => item.id),
            checked,
          )
        }
      />
      <CartList
        items={view}
        onSelect={(id, selected) => select(id, selected)}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemove}
      />
      <FreeShippingNotice remaining={remaining} />
      <OrderSummary orderAmount={orderAmount} shippingFee={shippingFee} total={total} />
      <OrderButton amount={total} disabled={orderAmount === 0} onCheckout={() => {}} />
    </Stack>
  );
}

const Empty = styled.p``;
