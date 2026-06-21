import { Stack } from "../../shared/components/layout/Stack.tsx";
import type { SelectableCartItem } from "../types.ts";

import { CartItem } from "./CartItem.tsx";

interface CartListProps {
  items: SelectableCartItem[];
  onSelect: (id: number, selected: boolean) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

export function CartList({ items, onSelect, onQuantityChange, onRemove }: CartListProps) {
  return (
    <Stack as="ul" gap={16} css={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((item) => (
        <CartItem
          key={item.id}
          item={item}
          onSelect={onSelect}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
        />
      ))}
    </Stack>
  );
}
