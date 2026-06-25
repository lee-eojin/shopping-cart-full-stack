import styled from "@emotion/styled";
import { useOptimistic, useTransition } from "react";

import { OrderSummary } from "../../cart/components/OrderSummary.tsx";
import { CouponModal } from "../../coupon/components/CouponModal.tsx";
import { useCoupons } from "../../coupon/hooks/useCoupons.ts";
import type { CouponsResponse } from "../../coupon/type.ts";
import { ApiError } from "../../shared/api/client.ts";
import { useQueryCache } from "../../shared/api/query/queryCacheContext.ts";
import { ErrorMessage } from "../../shared/components/feedback/ErrorMessage.tsx";
import { Spinner } from "../../shared/components/feedback/Spinner.tsx";
import { Media } from "../../shared/components/layout/Media.tsx";
import { Row } from "../../shared/components/layout/Row.tsx";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { formatPrice } from "../../shared/lib/format.ts";
import { useOverlay } from "../../shared/overlay/overlayContext.ts";
import { useOrder } from "../hooks/useOrder.ts";
import { useOrderMutations } from "../hooks/useOrderMutation.ts";
import type { Order } from "../type.ts";

interface OrderConfirmContainerProps {
  onProceed: () => void; // navigate("/order/complete")
}

export function OrderConfirmContainer({ onProceed }: OrderConfirmContainerProps) {
  const { data: order, isLoading, error, refetch } = useOrder();
  const { data: couponsData } = useCoupons();
  const { changeDestination, applyCoupons } = useOrderMutations();
  const cache = useQueryCache();
  const overlay = useOverlay();
  const [isPending, startTransition] = useTransition();

  const [optimisticOrder, patchSelection] = useOptimistic(order, (current, patch: Pick<Order, "isRemoteArea">) =>
    current ? { ...current, ...patch } : current,
  );

  if (isLoading) return <Spinner />;
  if (error || !optimisticOrder) return <ErrorMessage onRetry={refetch} />;

  const currentOrder = optimisticOrder;

  function onToggleRemoteArea(checked: boolean) {
    startTransition(async () => {
      patchSelection({ isRemoteArea: checked });
      try {
        const updated = await changeDestination.mutateAsync({ isRemoteArea: checked });
        cache.setData(["order"], updated);
      } catch {
        /* error 상태로 surface, 낙관적 값은 transition 종료로 자동 복귀 */
      }
    });
  }

  async function openCouponModal() {
    if (!couponsData) return;
    await cache.invalidate(["coupons"]); // 최신 applicable 재조회
    const latestCoupons = cache.getState<CouponsResponse>(["coupons"])?.data ?? couponsData;
    const updated = await overlay.openAsync<Order>(({ close }) => (
      <CouponModal
        coupons={latestCoupons.coupons}
        initialSelected={currentOrder.couponIds}
        onApply={async (couponIds) => {
          try {
            return await applyCoupons.mutateAsync({ couponIds });
          } catch (reason) {
            if (reason instanceof ApiError && reason.code === "COUPON_NOT_APPLICABLE")
              void cache.invalidate(["coupons"]);
            throw reason;
          }
        }}
        onClose={close}
      />
    ));
    if (updated) cache.setData(["order"], updated);
  }

  const itemKinds = currentOrder.items.length;
  const paidQuantity = currentOrder.items.reduce((sum, item) => sum + item.productQuantity, 0);
  const bonusQuantity = currentOrder.items.reduce((sum, item) => sum + item.bonusQuantity, 0);
  const receivedQuantity = paidQuantity + bonusQuantity;
  const isRecalculating = isPending || changeDestination.isPending;

  return (
    <Stack gap={2}>
      <p>총 {itemKinds}종류의 상품{paidQuantity}개를 주문합니다.</p>
      <p>(BOGO쿠폰 적용 포함 수령 총{receivedQuantity}개)</p>
      <p>최종 결제 금액을 확인해 주세요.</p>
      <ItemList>
        {currentOrder.items.map((item) => (
          <li key={item.productId}>
            <Media gap={12}>
              <img src={item.imageUrl} alt={item.productName} width={64} height={64} />
              <Stack gap={8}>
                <span>{item.productName}</span>
                <span>{formatPrice(item.productPrice)}</span>
                <span>결제 수량 {item.productQuantity}</span>
                {item.bonusQuantity > 0 && <span>증정 수량 {item.bonusQuantity}</span>}
              </Stack>
            </Media>
          </li>
        ))}
      </ItemList>

      <Row
        left={
          <label>
            <input
              type="checkbox"
              checked={currentOrder.isRemoteArea}
              disabled={isRecalculating}
              onChange={(event) => onToggleRemoteArea(event.target.checked)}
            />
            도서산간 지역
          </label>
        }
        right={<button type="button" disabled={!couponsData} onClick={openCouponModal}>쿠폰 선택</button>}
      />
      {changeDestination.error && <ErrorMessage message="배송지 변경에 실패했습니다." />}

      <div aria-busy={isRecalculating}>
        <OrderSummary
          orderAmount={currentOrder.orderAmount}
          couponDiscountAmount={currentOrder.couponDiscountAmount}
          bonusProductAmount={currentOrder.bonusProductAmount}
          shippingFee={currentOrder.shippingFee}
          total={currentOrder.totalPaymentAmount}
        />
      </div>

      <PayButton type="button" onClick={onProceed}>
        결제하기
      </PayButton>
    </Stack>
  );
}

const ItemList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PayButton = styled.button`
  width: 100%;
  padding: 16px;
`;
