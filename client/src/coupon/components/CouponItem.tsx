import styled from "@emotion/styled";

import { formatPrice } from "../../shared/lib/format.ts";
import type { AssessedCoupon, CouponId } from "../type.ts";

interface CouponItemProps {
  coupon: AssessedCoupon;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: CouponId) => void;
}

export function CouponItem({ coupon, checked, disabled, onToggle }: CouponItemProps) {
  return (
    <Card disabled={disabled}>
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(coupon.id)}
        />
        {coupon.description}
      </label>
      {coupon.applicable && coupon.standaloneDiscountAmount > 0 && (
        <Meta>할인 금액: {formatPrice(coupon.standaloneDiscountAmount)}</Meta>
      )}
      {coupon.applicable && coupon.standaloneBonusProductAmount > 0 && (
        <Meta>증정 혜택: {formatPrice(coupon.standaloneBonusProductAmount)}</Meta>
      )}
      <Meta>만료일: {coupon.expirationDate}</Meta>
      {"minimumOrderAmount" in coupon && (
        <Meta>최소 주문 금액: {formatPrice(coupon.minimumOrderAmount)}</Meta>
      )}
      {"availableTime" in coupon && (
        <Meta>사용 가능 시간: {coupon.availableTime.start} ~ {coupon.availableTime.end}</Meta>
      )}
    </Card>
  );
}

const Card = styled.li<{ disabled: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? "none" : "auto")};
`;

const Meta = styled.span``;
