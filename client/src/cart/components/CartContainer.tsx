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
import { calcOrderAmount, calcShippingFee, calcTotal, clampQuantity, FREE_SHIPPING_THRESHOLD } from "../cartModel.ts";

export function CartContainer() {
  const { data: items, isLoading, error, refetch } = useCart();
  const { updateQuantity, removeFromCart } = useCartMutations();
  const { isSelected, select, setAll } = useSelection();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage onRetry={refetch} />;
  if (!items || items.length === 0) return <Empty>장바구니가 비어 있습니다</Empty>;

  const view = items.map((item) => ({ ...item, selected: isSelected(item.id) }));
  const orderAmount = calcOrderAmount(view);
  const shippingFee = calcShippingFee(orderAmount);
  const total = calcTotal(orderAmount, shippingFee);
  const remaining = FREE_SHIPPING_THRESHOLD - orderAmount;
  const allSelected = view.every((item) => item.selected);

  return (
    <Stack gap={24}>
      <SelectAll
        checked={allSelected}
        onSelectAll={(checked) =>
          setAll(
            items.map((item) => item.id),
            checked,
          )
        }
      />
      <CartList
        items={view}
        onSelect={(id, selected) => select(id, selected)}
        onQuantityChange={(id, quantity) => updateQuantity.mutate({ id, quantity: clampQuantity(quantity) })}
        onRemove={(id) => removeFromCart.mutate(id)}
      />
      <FreeShippingNotice remaining={remaining} />
      <OrderSummary orderAmount={orderAmount} shippingFee={shippingFee} total={total} />
      <OrderButton amount={total} disabled={orderAmount === 0} onCheckout={() => {}} />
    </Stack>
  );
}

const Empty = styled.p`
  text-align: center;
  color: #888;
`;
