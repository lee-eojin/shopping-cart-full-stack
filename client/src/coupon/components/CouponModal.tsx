import styled from "@emotion/styled";
import { useEffect, useRef, useState, type SyntheticEvent, type MouseEvent } from "react";

import { useCouponPreview } from "../../order/hooks/useCouponPreview.ts";
import type { Order } from "../../order/type.ts";
import { formatPrice } from "../../shared/lib/format.ts";
import { useAsyncAction } from "../../shared/lib/useAsyncAction.ts";
import { useDebouncedValue } from "../../shared/lib/useDebouncedValue.ts";
import { toggleSelection, canSelectMore, forDisplay, MAX_COUPONS } from "../couponModel.ts";
import type { AssessedCoupon, CouponId } from "../type.ts";

import { CouponItem } from "./CouponItem.tsx";


interface CouponModalProps {
  coupons: readonly AssessedCoupon[];
  initialSelected: readonly CouponId[];
  onApply: (couponIds: CouponId[]) => Promise<Order>;
  onClose: (result: Order | null) => void;
}

export function CouponModal({ coupons, initialSelected, onApply, onClose }: CouponModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolved = useRef<Order | null>(null);
  const [selected, setSelected] = useState<CouponId[]>(() => [...initialSelected]);
  const debounced = useDebouncedValue(selected, 200);
  const { data: preview, isLoading, error: previewError } = useCouponPreview(debounced);

  useEffect(function openAsModal() {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const toggle = (id: CouponId) => setSelected((prev) => toggleSelection(prev, id));
  const atLimit = !canSelectMore(selected);
  const isDebouncing = selected.join(",") !== debounced.join(",");
  const isPriceStale = isDebouncing || isLoading || Boolean(previewError);

  const apply = useAsyncAction(async () => {
    resolved.current = await onApply(selected);
    dialogRef.current?.close();
  });

  const handleClose = () => onClose(resolved.current);
  const requestCancel = () => {
    resolved.current = null;
    dialogRef.current?.close();
  };
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    requestCancel();
  };
  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) requestCancel();
  };

  return (
    <Dialog
      ref={dialogRef}
      aria-label="쿠폰을 선택해 주세요"
      onClose={handleClose}
      onCancel={handleCancel}
      onClick={onBackdropClick}
    >
      <header>
        <h2>쿠폰을 선택해 주세요</h2>
        <button type="button" aria-label="닫기" onClick={requestCancel}>x</button>
      </header>
      <p>쿠폰은 최대 {MAX_COUPONS}개까지 사용할 수 있습니다.</p>
      <ul>
        {forDisplay(coupons).map((coupon) => {
          const checked = selected.includes(coupon.id);
          return (
            <CouponItem
              key={coupon.id}
              coupon={coupon}
              checked={checked}
              disabled={!coupon.applicable || (atLimit && !checked)}
              onToggle={toggle}
            />
          );
        })}
      </ul>
      {apply.error && <p role="alert">쿠폰 적용에 실패했습니다.</p>}
      {previewError && <p role="alert">쿠폰 혜택을 불러오지 못했습니다.</p>}
      <button type="button" disabled={apply.isPending || isPriceStale} onClick={() => apply.run()}>
        {isPriceStale
          ? "쿠폰 혜택 계산 중…"
          : `총 ${formatPrice(preview?.totalBenefitAmount ?? 0)} 할인 쿠폰 사용하기`}
      </button>
    </Dialog>
  );
}

const Dialog = styled.dialog`
  border: none;
  border-radius: 8px;
  padding: 24px;
  &::backdrop {
    background: rgba(0, 0, 0, 0.4);
  }
`;
