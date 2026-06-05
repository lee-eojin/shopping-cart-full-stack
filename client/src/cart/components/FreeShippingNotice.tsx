import styled from "@emotion/styled";
import { formatPrice } from "../../shared/lib/format.ts";

interface FreeShippingNoticeProps {
  remaining: number;
}

export function FreeShippingNotice({ remaining }: FreeShippingNoticeProps) {
  if (remaining <= 0) {
    return <Notice>무료배송 대상입니다</Notice>;
  }
  return <Notice>{formatPrice(remaining)} 더 담으면 무료배송</Notice>;
}

const Notice = styled.p``;
