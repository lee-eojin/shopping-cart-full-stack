import type { ComponentPropsWithRef } from "react";
import styled from "@emotion/styled";
import { Stack } from "../../shared/components/layout/Stack.tsx";
import { Row } from "../../shared/components/layout/Row.tsx";
import { Media } from "../../shared/components/layout/Media.tsx";
import { formatPrice } from "../../shared/lib/format.ts";
import type { SelectableCartItem } from "../types.ts";

interface CartItemProps extends Omit<ComponentPropsWithRef<"li">, "onSelect"> {
  item: SelectableCartItem;
  onSelect: (id: number, selected: boolean) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

export function CartItem({ item, onSelect, onQuantityChange, onRemove, ...rest }: CartItemProps) {
  return (
    <li {...rest}>
      <Stack gap={10}>
        <Row
          left={
            <input
              type="checkbox"
              checked={item.selected}
              onChange={(event) => onSelect(item.id, event.target.checked)}
              aria-label={`${item.name} 선택`}
            />
          }
          right={
            <button type="button" onClick={() => onRemove(item.id)}>
              삭제
            </button>
          }
        />
        <Media gap={12}>
          <img src={item.imageUrl} alt={item.name} width={80} height={80} />
          <Stack gap={4}>
            <span>{item.name}</span>
            <span>{formatPrice(item.price)}</span>
            <QuantityControl>
              <button type="button" aria-label="수량 감소" onClick={() => onQuantityChange(item.id, item.quantity - 1)}>
                -
              </button>
              <Quantity aria-label="수량">{item.quantity}</Quantity>
              <button type="button" aria-label="수량 증가" onClick={() => onQuantityChange(item.id, item.quantity + 1)}>
                +
              </button>
            </QuantityControl>
          </Stack>
        </Media>
      </Stack>
    </li>
  );
}

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
`;

const Quantity = styled.span`
  display: inline-block;
  min-width: 24px;
  text-align: center;
`;
