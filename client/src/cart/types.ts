import type { Product } from "../product/types";

export type CartItem = Product;

export type UpdateQuantityRequest = Pick<Product, "quantity">;

export type CartItemPatch = Partial<Product>;

export type SelectionState = Record<Product["id"], boolean>;

export interface SelectableCartItem extends CartItem {
  selected: boolean;
}
