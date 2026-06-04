export interface Product {
  id: number;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export type CreateProductRequest = Omit<Product, "id">;
